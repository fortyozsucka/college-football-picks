import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cfbApi } from '@/lib/cfb-api'
import { classifyGame } from '@/lib/game-classification'
import { PushNotificationService, NotificationTemplates } from '@/lib/push-notifications'
import { SideBetService } from '@/lib/sidebets'

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
    const includePostseason = searchParams.get('postseason') === 'true' || searchParams.get('postseason') === '1'

    console.log(`Syncing games for Week ${week}, Season ${season}`)
    console.log(`Current season detected: ${currentSeason}`)
    console.log(`Include postseason: ${includePostseason}`)

    // Fetch games from CFB API
    let cfbGames = await cfbApi.getGames(season, week)
    console.log(`Fetched ${cfbGames.length} regular season games from CFB API`)

    // Fetch betting lines
    let cfbLines = await cfbApi.getLines(season, week)
    console.log(`Fetched ${cfbLines.length} regular season betting lines from CFB API`)

    // If postseason is requested or we're in weeks 14+, also fetch postseason games
    if (includePostseason || week >= 14) {
      const postseasonGames = await cfbApi.getPostseasonGames(season)
      console.log(`Fetched ${postseasonGames.length} postseason games from CFB API`)
      cfbGames = [...cfbGames, ...postseasonGames]

      const postseasonLines = await cfbApi.getPostseasonLines(season)
      console.log(`Fetched ${postseasonLines.length} postseason betting lines from CFB API`)
      cfbLines = [...cfbLines, ...postseasonLines]
    }

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
    let newlyCompletedGames: string[] = []

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
      // Pass the notes field from CFB API - this is the primary way to identify championship games
      const gameClassification = classifyGame(homeTeam, awayTeam, week, season, cfbGame.notes)
      
      // Log special games for debugging
      if (gameClassification.gameType !== 'REGULAR') {
        console.log(`🏆 Special game detected: ${awayTeam} @ ${homeTeam} - ${gameClassification.description} (notes: "${cfbGame.notes || 'none'}")`)
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
        period: cfbGame.period || null,
        clock: cfbGame.clock || null,
        status: cfbGame.status || null,
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
        // Check if game was just completed (wasn't completed before, but is now)
        const wasJustCompleted = !existingGame.completed && gameData.completed
        
        // Update existing game
        await db.game.update({
          where: { id: existingGame.id },
          data: gameData
        })
        gamesUpdated++
        
        // Track newly completed games for notifications
        if (wasJustCompleted) {
          newlyCompletedGames.push(existingGame.id)
        }
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

    // Send notifications for newly completed games
    let notificationsSent = 0
    if (newlyCompletedGames.length > 0) {
      console.log(`📱 Sending notifications for ${newlyCompletedGames.length} newly completed games`)
      
      try {
        // Get picks for newly completed games
        const picksForCompletedGames = await db.pick.findMany({
          where: {
            gameId: { in: newlyCompletedGames }
          },
          include: {
            user: {
              include: {
                notificationPreferences: true
              }
            },
            game: true
          }
        })

        // Group picks by user
        const picksByUser = new Map<string, typeof picksForCompletedGames>()
        picksForCompletedGames.forEach(pick => {
          if (!picksByUser.has(pick.userId)) {
            picksByUser.set(pick.userId, [])
          }
          picksByUser.get(pick.userId)!.push(pick)
        })

        // Send notifications to each user
        for (const [userId, userPicks] of Array.from(picksByUser.entries())) {
          const user = userPicks[0].user
          
          // Check if user wants game result notifications
          if (!user.notificationPreferences?.gameResults || !user.notificationPreferences?.pushNotifications) {
            continue
          }

          // Send a notification for each completed game the user picked
          for (const pick of userPicks) {
            try {
              const won = (pick.points || 0) > 0
              const notification = NotificationTemplates.gameResult(
                pick.pickedTeam,
                won,
                pick.points || 0
              )
              
              await PushNotificationService.sendToUser(userId, notification)
              notificationsSent++
            } catch (error) {
              console.error(`Error sending game result notification to user ${userId}:`, error)
            }
          }
        }
        
        console.log(`✅ Sent ${notificationsSent} game result notifications`)
      } catch (error) {
        console.error('Error sending game completion notifications:', error)
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

    // Cancel expired side bets first
    let sideBetsCancelled = 0
    try {
      console.log(`🚫 Checking for expired side bets...`)
      const cancelResult = await SideBetService.cancelExpiredSideBets()
      sideBetsCancelled = cancelResult.cancelled
      console.log(`✅ Cancelled ${sideBetsCancelled} expired side bets`)
    } catch (error) {
      console.error('Error cancelling expired side bets:', error)
      // Don't fail the sync if side bet cancellation fails
    }

    // Resolve side bets for newly completed games
    let sideBetsResolved = 0
    if (newlyCompletedGames.length > 0) {
      console.log(`🎰 Resolving side bets for ${newlyCompletedGames.length} newly completed games`)
      
      try {
        for (const gameId of newlyCompletedGames) {
          const result = await SideBetService.resolveGameSideBets(gameId)
          sideBetsResolved += result.resolved
        }
        
        console.log(`✅ Resolved ${sideBetsResolved} side bets`)
      } catch (error) {
        console.error('Error resolving side bets:', error)
        // Don't fail the sync if side bet resolution fails
      }
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
      newlyCompletedGames: newlyCompletedGames.length,
      notificationsSent,
      pointsCalculated: pointsResult?.updatedPicks || 0,
      sideBetsCancelled,
      sideBetsResolved,
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
    parameters: '?week=1&season=2025&postseason=true',
    examples: [
      'Regular season: POST /api/games/sync?week=15&season=2024',
      'Include postseason: POST /api/games/sync?week=15&season=2024&postseason=true',
      'Postseason only: POST /api/games/sync?week=16&season=2024&postseason=true'
    ],
    notes: [
      'Postseason games are automatically included for weeks 14+',
      'Use postseason=true to explicitly include bowl games, playoffs, and Army-Navy',
      'Postseason includes all bowl games, CFP games, and championship games'
    ]
  })
}