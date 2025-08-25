import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cfbApi } from '@/lib/cfb-api'
import { classifyGame } from '@/lib/game-classification'

function getCurrentSeason(): number {
  const now = new Date()
  const year = now.getFullYear()
  // College football season typically runs from August to January of next year
  // Month is 0-indexed, so 7 = August
  return now.getMonth() >= 7 ? year : year - 1
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentSeason = getCurrentSeason()
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || currentSeason.toString())

    console.log(`Syncing games for Week ${week}, Season ${season}`)
    console.log(`Current season detected: ${currentSeason}`)

    // Fetch games from CFB API
    const cfbGames = await cfbApi.getGames(season, week)
    console.log(`Fetched ${cfbGames.length} games from CFB API`)

    // Fetch betting lines
    const cfbLines = await cfbApi.getLines(season, week)
    console.log(`Fetched ${cfbLines.length} betting lines from CFB API`)

    // Fetch team data for logos
    const teams = await cfbApi.getTeams()
    console.log(`Fetched ${teams.length} teams from CFB API`)
    
    // Create team lookup map
    const teamsMap = new Map()
    teams.forEach(team => {
      teamsMap.set(team.id.toString(), {
        logo: team.logos && team.logos.length > 0 ? team.logos[0] : null
      })
    })

    // Preferred sportsbook order (most to least preferred)
    const preferredProviders = ['DraftKings', 'ESPN Bet', 'Bovada']
    
    // Create a map of lines by game ID
    const linesMap = new Map()
    cfbLines.forEach(line => {
      if (line.lines && line.lines.length > 0) {
        // Find the most preferred provider available for this game
        let selectedLine = line.lines[0] // fallback to first line
        
        for (const preferredProvider of preferredProviders) {
          const preferredLine = line.lines.find(l => l.provider === preferredProvider)
          if (preferredLine) {
            selectedLine = preferredLine
            break
          }
        }
        
        // Log which sportsbook/provider we're using for debugging
        if (line.lines.length > 1) {
          const allSources = line.lines.map(l => `${l.provider}: ${l.spread}`).join(', ')
          console.log(`Game ${line.id}: Using spread ${selectedLine.spread} from ${selectedLine.provider} (${line.lines.length} sources available: ${allSources})`)
        } else {
          console.log(`Game ${line.id}: Using spread ${selectedLine.spread} from ${selectedLine.provider} (only source)`)
        }
        
        linesMap.set(line.id, {
          spread: selectedLine.spread,
          overUnder: selectedLine.overUnder,
          provider: selectedLine.provider
        })
      }
    })

    let gamesCreated = 0
    let gamesUpdated = 0

    // Process each game
    for (const cfbGame of cfbGames) {
      // Skip games where either team is not FBS
      if (cfbGame.homeClassification !== 'fbs' || cfbGame.awayClassification !== 'fbs') {
        continue
      }
      
      const lineData = linesMap.get(cfbGame.id)
      
      const gameId = cfbGame.id.toString()
      // Use the correct field name from CFB API
      const startTime = cfbGame.startDate ? new Date(cfbGame.startDate) : new Date()


      const homeTeam = cfbGame.homeTeam || cfbGame.home_team || cfbGame.home || 'Unknown Home Team'
      const awayTeam = cfbGame.awayTeam || cfbGame.away_team || cfbGame.away || 'Unknown Away Team'
      
      // Get team data from teams map
      const homeTeamId = cfbGame.homeId?.toString()
      const awayTeamId = cfbGame.awayId?.toString()
      const homeTeamData = homeTeamId ? teamsMap.get(homeTeamId) : null
      const awayTeamData = awayTeamId ? teamsMap.get(awayTeamId) : null

      // Classify the game type using our classification system
      const gameClassification = classifyGame(homeTeam, awayTeam, week, season, cfbGame.notes)
      
      // Log special games for debugging
      if (gameClassification.gameType !== 'REGULAR') {
        console.log(`🏆 Special game detected: ${awayTeam} @ ${homeTeam} - ${gameClassification.description}`)
      }

      const gameData = {
        cfbId: gameId,
        week,
        season,
        homeTeam,
        awayTeam,
        homeTeamId: homeTeamId || null,
        awayTeamId: awayTeamId || null,
        homeTeamLogo: homeTeamData?.logo || null,
        awayTeamLogo: awayTeamData?.logo || null,
        startTime,
        spread: lineData?.spread || 0,
        overUnder: lineData?.overUnder || null,
        homeScore: cfbGame.home_points || cfbGame.homePoints || null,
        awayScore: cfbGame.away_points || cfbGame.awayPoints || null,
        completed: cfbGame.completed || false,
        winner: cfbGame.completed ? 
          ((cfbGame.home_points || cfbGame.homePoints || 0) > (cfbGame.away_points || cfbGame.awayPoints || 0) ? homeTeam : awayTeam) : null,
        gameType: gameClassification.gameType
      }

      // Check if game already exists
      const existingGame = await db.game.findFirst({
        where: {
          cfbId: gameId
        }
      })

      if (existingGame) {
        // Update existing game
        await db.game.update({
          where: { id: existingGame.id },
          data: gameData
        })
        gamesUpdated++
      } else {
        // Create new game
        await db.game.create({
          data: {
            id: gameId,
            ...gameData
          }
        })
        gamesCreated++
      }
    }

    // Calculate points for any newly completed games
    let pointsResult = null
    try {
      const pointsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/picks/calculate-points`, {
        method: 'POST'
      })
      if (pointsResponse.ok) {
        pointsResult = await pointsResponse.json()
        console.log('Points calculation result:', pointsResult)
      }
    } catch (error) {
      console.error('Error calculating points:', error)
      // Don't fail the sync if points calculation fails
    }

    // Check for automatic week progression after sync
    let progressionResult = null
    try {
      console.log('🔄 Checking for automatic week progression...')
      const progressResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/weeks/auto-progress`, {
        method: 'POST'
      })
      if (progressResponse.ok) {
        progressionResult = await progressResponse.json()
        console.log('Week progression result:', progressionResult)
      }
    } catch (error) {
      console.error('Error checking week progression:', error)
      // Don't fail the sync if progression check fails
    }

    return NextResponse.json({
      message: 'Games synced successfully',
      week,
      season,
      gamesCreated,
      gamesUpdated,
      totalGames: cfbGames.length,
      pointsCalculated: pointsResult?.updatedPicks || 0,
      weekProgression: progressionResult || { progressed: false }
    })

  } catch (error) {
    console.error('Error syncing games:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync games',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Game sync endpoint',
    usage: 'POST to this endpoint to sync games from CFB API',
    parameters: '?week=1&season=2024'
  })
}