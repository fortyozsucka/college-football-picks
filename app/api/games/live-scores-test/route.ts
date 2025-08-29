import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cfbApi } from '@/lib/cfb-api'

function getCurrentSeason(): number {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 7 ? year : year - 1
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentSeason = getCurrentSeason()
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || currentSeason.toString())

    console.log(`Testing live scores for Week ${week}, Season ${season}`)

    // Fetch games from CFB API
    const cfbGames = await cfbApi.getGames(season, week)
    console.log(`Fetched ${cfbGames.length} games from CFB API`)

    const liveGames = []
    const completedGames = []
    const upcomingGames = []
    let updatedGames = 0

    // Process each game to categorize and update scores
    for (const cfbGame of cfbGames) {
      // Skip non-FBS games
      if (cfbGame.homeClassification !== 'fbs' || cfbGame.awayClassification !== 'fbs') {
        continue
      }

      const gameId = cfbGame.id.toString()
      const homeTeam = cfbGame.homeTeam || cfbGame.home_team || cfbGame.home || 'Unknown Home Team'
      const awayTeam = cfbGame.awayTeam || cfbGame.away_team || cfbGame.away || 'Unknown Away Team'
      const homeScore = cfbGame.home_points || cfbGame.homePoints || null
      const awayScore = cfbGame.away_points || cfbGame.awayPoints || null
      const isCompleted = cfbGame.completed || false
      const startTime = new Date(cfbGame.startDate || new Date())
      const now = new Date()

      // Categorize games
      if (isCompleted) {
        completedGames.push({
          id: gameId,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          status: 'Completed'
        })
      } else if (startTime <= now) {
        liveGames.push({
          id: gameId,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          startTime: startTime.toISOString(),
          status: homeScore !== null || awayScore !== null ? 'Live' : 'Started (no score yet)'
        })
      } else {
        upcomingGames.push({
          id: gameId,
          homeTeam,
          awayTeam,
          startTime: startTime.toISOString(),
          status: 'Upcoming'
        })
      }

      // Update the game in database if it exists
      const existingGame = await db.game.findFirst({
        where: { cfbId: gameId }
      })

      if (existingGame) {
        const previousHomeScore = existingGame.homeScore
        const previousAwayScore = existingGame.awayScore
        const previousCompleted = existingGame.completed

        // Check if there are actual updates
        const scoreUpdated = previousHomeScore !== homeScore || previousAwayScore !== awayScore
        const statusUpdated = previousCompleted !== isCompleted

        if (scoreUpdated || statusUpdated) {
          await db.game.update({
            where: { id: existingGame.id },
            data: {
              homeScore,
              awayScore,
              completed: isCompleted,
              winner: isCompleted && homeScore !== null && awayScore !== null
                ? (homeScore > awayScore ? homeTeam : awayTeam)
                : null
            }
          })
          updatedGames++

          console.log(`Updated game ${homeTeam} vs ${awayTeam}: ${awayScore}-${homeScore} (${isCompleted ? 'Final' : 'Live'})`)
        }
      }
    }

    return NextResponse.json({
      message: 'Live scores test completed',
      week,
      season,
      totalGamesChecked: cfbGames.length,
      updatedGames,
      categorization: {
        upcoming: {
          count: upcomingGames.length,
          games: upcomingGames.slice(0, 5) // Show first 5
        },
        live: {
          count: liveGames.length,
          games: liveGames
        },
        completed: {
          count: completedGames.length,
          games: completedGames.slice(0, 5) // Show first 5
        }
      },
      apiAccess: {
        tier: "Testing Tier 1 access for live scores",
        liveGamesDetected: liveGames.length,
        hasLiveScores: liveGames.some(g => g.homeScore !== null || g.awayScore !== null)
      }
    })

  } catch (error) {
    console.error('Error testing live scores:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test live scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Live scores test endpoint',
    usage: 'POST to this endpoint to test live score updates from CFB API',
    parameters: '?week=1&season=2024',
    description: 'This endpoint tests your Tier 1 API access by fetching live scores and categorizing games'
  })
}