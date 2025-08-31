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

    console.log(`🔴 LIVE sync for Week ${week}, Season ${season}`)

    // Use scoreboard API for better live score data
    const cfbGames = await cfbApi.getScoreboard(season, week)
    console.log(`Fetched ${cfbGames.length} games from CFB Scoreboard API`)

    let gamesUpdated = 0
    let liveGamesFound = 0
    let scoreUpdates = 0

    // Only process games that have started or completed
    for (const cfbGame of cfbGames) {
      // Skip games where either team is not FBS (scoreboard API uses game.classification)
      if (cfbGame.classification !== 'fbs') {
        continue
      }

      const gameId = cfbGame.id.toString()
      const startTime = cfbGame.startDate ? new Date(cfbGame.startDate) : new Date()
      const now = new Date()
      
      // Only sync games that have started or are in progress
      const gameStatus = cfbGame.status
      if (gameStatus !== 'in_progress' && gameStatus !== 'completed') {
        continue
      }

      liveGamesFound++

      const homeScore = cfbGame.homeTeam?.points || null
      const awayScore = cfbGame.awayTeam?.points || null
      const isCompleted = gameStatus === 'completed'

      // Check if game exists in database
      const existingGame = await db.game.findFirst({
        where: { cfbId: gameId }
      })

      if (existingGame) {
        const previousHomeScore = existingGame.homeScore
        const previousAwayScore = existingGame.awayScore
        const scoreChanged = previousHomeScore !== homeScore || previousAwayScore !== awayScore

        if (scoreChanged || existingGame.completed !== isCompleted) {
          await db.game.update({
            where: { id: existingGame.id },
            data: {
              homeScore,
              awayScore,
              completed: isCompleted,
              winner: isCompleted && homeScore !== null && awayScore !== null
                ? (homeScore > awayScore 
                    ? existingGame.homeTeam 
                    : awayScore > homeScore 
                      ? existingGame.awayTeam 
                      : null)
                : null,
              updatedAt: new Date()
            }
          })
          
          gamesUpdated++
          
          if (scoreChanged) {
            scoreUpdates++
            console.log(`⚡ LIVE UPDATE: ${existingGame.awayTeam} @ ${existingGame.homeTeam}: ${awayScore}-${homeScore} ${isCompleted ? '(Final)' : '(Live)'} `)
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Live sync completed',
      timestamp: new Date().toISOString(),
      week,
      season,
      liveGamesFound,
      gamesUpdated,
      scoreUpdates,
      summary: `Found ${liveGamesFound} live games, updated ${gamesUpdated} games with ${scoreUpdates} score changes`
    })

  } catch (error) {
    console.error('Live sync failed:', error)
    return NextResponse.json(
      { 
        error: 'Live sync failed',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const currentSeason = getCurrentSeason()
  return NextResponse.json({
    message: 'Live sync endpoint - focuses only on updating scores for games in progress',
    usage: 'POST to this endpoint to sync live scores only (faster than full sync)',
    parameters: `?week=1&season=${currentSeason}`,
    currentSeason,
    detectedSeason: currentSeason
  })
}