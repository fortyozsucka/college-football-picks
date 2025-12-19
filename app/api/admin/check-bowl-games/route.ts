import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { determineBowlTier } from '@/lib/game-classification'

export async function GET() {
  try {
    // Get all bowl and playoff games
    const bowlGames = await db.game.findMany({
      where: {
        gameType: {
          in: ['BOWL', 'PLAYOFF', 'CHAMPIONSHIP', 'ARMY_NAVY']
        }
      },
      orderBy: [
        { week: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        picks: {
          select: {
            id: true,
            userId: true,
            pickedTeam: true,
            isDoubleDown: true,
            points: true,
            result: true
          }
        }
      }
    })

    if (bowlGames.length === 0) {
      return NextResponse.json({
        message: 'No bowl, playoff, championship, or Army-Navy games found',
        suggestion: 'Use POST /api/admin/sync-postseason to import postseason games'
      })
    }

    const stats = {
      BOWL: { total: 0, completed: 0, upcoming: 0, picks: 0, scoredPicks: 0 },
      PLAYOFF: { total: 0, completed: 0, upcoming: 0, picks: 0, scoredPicks: 0 },
      CHAMPIONSHIP: { total: 0, completed: 0, upcoming: 0, picks: 0, scoredPicks: 0 },
      ARMY_NAVY: { total: 0, completed: 0, upcoming: 0, picks: 0, scoredPicks: 0 }
    }

    const gameDetails: any[] = []
    const issues: any[] = []

    for (const game of bowlGames) {
      const pickCount = game.picks.length
      const scoredCount = game.picks.filter(p => p.points !== null).length
      const bowlTier = (game.gameType === 'BOWL' || game.gameType === 'PLAYOFF')
        ? determineBowlTier(game.notes || '', '')
        : undefined

      stats[game.gameType as keyof typeof stats].total++
      if (game.completed) {
        stats[game.gameType as keyof typeof stats].completed++
      } else {
        stats[game.gameType as keyof typeof stats].upcoming++
      }
      stats[game.gameType as keyof typeof stats].picks += pickCount
      stats[game.gameType as keyof typeof stats].scoredPicks += scoredCount

      // Check for issues
      if (game.completed && game.picks.some(p => p.points === null)) {
        issues.push({
          type: 'UNSCORED_PICKS',
          game: `${game.awayTeam} @ ${game.homeTeam}`,
          week: game.week,
          unscoredCount: game.picks.filter(p => p.points === null).length
        })
      }

      const picksWithoutDD = game.picks.filter(p => !p.isDoubleDown)
      if (picksWithoutDD.length > 0) {
        issues.push({
          type: 'MISSING_DOUBLE_DOWN',
          game: `${game.awayTeam} @ ${game.homeTeam}`,
          week: game.week,
          count: picksWithoutDD.length
        })
      }

      gameDetails.push({
        week: game.week,
        type: game.gameType,
        bowlTier,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        startTime: game.startTime,
        completed: game.completed,
        spread: game.spread,
        notes: game.notes,
        pickCount,
        scoredCount,
        ...(game.completed && {
          score: `${game.awayTeam} ${game.awayScore}, ${game.homeTeam} ${game.homeScore}`,
          results: {
            wins: game.picks.filter(p => p.result === 'win').length,
            losses: game.picks.filter(p => p.result === 'loss').length,
            pushes: game.picks.filter(p => p.result === 'push').length,
            unscored: game.picks.filter(p => p.points === null).length
          }
        })
      })
    }

    // Check for upcoming games with picks
    const upcomingWithPicks = gameDetails.filter(g => !g.completed && g.pickCount > 0)

    return NextResponse.json({
      summary: {
        totalGames: bowlGames.length,
        totalPicks: bowlGames.reduce((sum, g) => sum + g.picks.length, 0),
        stats
      },
      upcomingGamesWithPicks: upcomingWithPicks.length,
      issues: issues.length > 0 ? issues : 'No issues found',
      games: gameDetails
    })

  } catch (error) {
    console.error('Error checking bowl games:', error)
    return NextResponse.json(
      { error: 'Failed to check bowl games', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
