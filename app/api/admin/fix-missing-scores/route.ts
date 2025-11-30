import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cfbApi } from '@/lib/cfb-api'

export async function GET() {
  try {
    // Find games marked completed but missing scores
    const incompleteGames = await db.game.findMany({
      where: {
        completed: true,
        OR: [
          { homeScore: null },
          { awayScore: null }
        ]
      },
      select: {
        id: true,
        cfbId: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        week: true,
        season: true
      },
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    return NextResponse.json({
      message: `Found ${incompleteGames.length} completed games with missing scores`,
      games: incompleteGames.map(game => ({
        id: game.id,
        cfbId: game.cfbId,
        matchup: `${game.homeTeam} vs ${game.awayTeam}`,
        week: `${game.season}-W${game.week}`,
        currentScore: `${game.homeScore}-${game.awayScore}`,
        missingHomeScore: game.homeScore === null,
        missingAwayScore: game.awayScore === null
      }))
    })

  } catch (error) {
    console.error('Error checking missing scores:', error)
    return NextResponse.json({ error: 'Failed to check missing scores' }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔄 Fixing missing game scores...')

    // Find games marked completed but missing scores
    const incompleteGames = await db.game.findMany({
      where: {
        completed: true,
        OR: [
          { homeScore: null },
          { awayScore: null }
        ]
      }
    })

    console.log(`Found ${incompleteGames.length} games with missing scores`)

    if (incompleteGames.length === 0) {
      return NextResponse.json({
        message: 'No games with missing scores found',
        fixedGames: 0
      })
    }

    // Group by week/season to batch API calls
    const weekSeasonMap = new Map<string, typeof incompleteGames>()
    incompleteGames.forEach(game => {
      const key = `${game.season}-${game.week}`
      if (!weekSeasonMap.has(key)) {
        weekSeasonMap.set(key, [])
      }
      weekSeasonMap.get(key)!.push(game)
    })

    let fixedGames = 0
    let skippedGames = 0

    // Fetch scores from CFB API for each week/season
    for (const [weekSeason, games] of Array.from(weekSeasonMap.entries())) {
      const [season, week] = weekSeason.split('-').map(Number)

      try {
        console.log(`📡 Fetching scores for ${season} week ${week}...`)
        const scoreboardData = await cfbApi.getScoreboard(season, week)

        // Create map of CFB game ID to scores
        const scoresMap = new Map()
        scoreboardData.forEach((cfbGame: any) => {
          if (cfbGame.status === 'completed') {
            // Treat null scores as 0 for completed games
            const homeScore = cfbGame.homeTeam?.points ?? 0
            const awayScore = cfbGame.awayTeam?.points ?? 0

            scoresMap.set(cfbGame.id.toString(), {
              homeScore,
              awayScore
            })
          }
        })

        // Update games with missing scores
        for (const game of games) {
          const cfbScores = scoresMap.get(game.cfbId)

          if (cfbScores) {
            await db.game.update({
              where: { id: game.id },
              data: {
                homeScore: cfbScores.homeScore,
                awayScore: cfbScores.awayScore
              }
            })

            fixedGames++
            console.log(`✅ Fixed ${game.homeTeam} vs ${game.awayTeam}: ${cfbScores.homeScore}-${cfbScores.awayScore}`)
          } else {
            skippedGames++
            console.log(`⚠️ No scores found for ${game.homeTeam} vs ${game.awayTeam} (CFB ID: ${game.cfbId})`)
          }
        }

        // Small delay between API calls to be respectful
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Failed to fetch scores for ${season} week ${week}:`, error)
        skippedGames += games.length
      }
    }

    console.log(`🎉 Score fixing complete: ${fixedGames} fixed, ${skippedGames} skipped`)

    return NextResponse.json({
      message: 'Missing scores have been fixed',
      fixedGames,
      skippedGames,
      totalProcessed: incompleteGames.length,
      nextStep: 'Run /api/admin/recalculate-all-historical to score the remaining picks'
    })

  } catch (error) {
    console.error('Error fixing missing scores:', error)
    return NextResponse.json({ error: 'Failed to fix missing scores' }, { status: 500 })
  }
}