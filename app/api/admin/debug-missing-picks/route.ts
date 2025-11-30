import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    console.log('🔍 Debugging missing picks...')

    // Check picks by status
    const pickStats = await db.pick.groupBy({
      by: ['points'],
      _count: true,
      orderBy: {
        points: 'asc'
      }
    })

    // Get all picks with their game completion status
    const allPicks = await db.pick.findMany({
      select: {
        id: true,
        userId: true,
        gameId: true,
        pickedTeam: true,
        lockedSpread: true,
        isDoubleDown: true,
        points: true,
        result: true,
        createdAt: true,
        game: {
          select: {
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            completed: true,
            week: true,
            season: true,
            spread: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { game: { season: 'desc' } },
        { game: { week: 'desc' } },
        { gameId: 'asc' }
      ]
    })

    // Categorize picks
    const categories = {
      scored: allPicks.filter(p => p.points !== null),
      unscored: allPicks.filter(p => p.points === null),
      completedButUnscored: allPicks.filter(p =>
        p.points === null &&
        p.game.completed &&
        p.game.homeScore !== null &&
        p.game.awayScore !== null
      ),
      incompleteGames: allPicks.filter(p =>
        p.points === null &&
        (!p.game.completed || p.game.homeScore === null || p.game.awayScore === null)
      )
    }

    // Group by week to see distribution
    const weeklyBreakdown = allPicks.reduce((acc, pick) => {
      const key = `${pick.game.season}-W${pick.game.week}`
      if (!acc[key]) {
        acc[key] = {
          season: pick.game.season,
          week: pick.game.week,
          totalPicks: 0,
          scoredPicks: 0,
          unscoredPicks: 0,
          completedGames: 0,
          incompleteGames: 0
        }
      }

      acc[key].totalPicks++
      if (pick.points !== null) {
        acc[key].scoredPicks++
      } else {
        acc[key].unscoredPicks++
      }

      if (pick.game.completed && pick.game.homeScore !== null && pick.game.awayScore !== null) {
        acc[key].completedGames++
      } else {
        acc[key].incompleteGames++
      }

      return acc
    }, {} as Record<string, any>)

    // Find weeks with missing picks (should have 5 picks per user per week)
    const weeklyPickCounts = Object.values(weeklyBreakdown).map((week: any) => ({
      ...week,
      expectedPicks: 5, // Assuming 5 picks per week per user
      potentialMissing: week.totalPicks < week.expectedPicks
    }))

    return NextResponse.json({
      summary: {
        totalPicks: allPicks.length,
        scoredPicks: categories.scored.length,
        unscoredPicks: categories.unscored.length,
        completedButUnscored: categories.completedButUnscored.length,
        incompleteGames: categories.incompleteGames.length
      },
      pickStats: pickStats.map(stat => ({
        pointValue: stat.points === null ? 'null (unscored)' : stat.points,
        count: stat._count
      })),
      weeklyBreakdown: Object.values(weeklyBreakdown).sort((a: any, b: any) => {
        if (a.season !== b.season) return b.season - a.season
        return b.week - a.week
      }),
      sampleUnscoredPicks: categories.unscored.slice(0, 10).map(pick => ({
        id: pick.id,
        user: pick.user.name || pick.user.email,
        game: `${pick.game.homeTeam} vs ${pick.game.awayTeam}`,
        week: `${pick.game.season}-W${pick.game.week}`,
        pickedTeam: pick.pickedTeam,
        lockedSpread: pick.lockedSpread,
        gameCompleted: pick.game.completed,
        hasScores: pick.game.homeScore !== null && pick.game.awayScore !== null,
        finalScore: pick.game.completed ? `${pick.game.homeScore}-${pick.game.awayScore}` : 'Not completed'
      })),
      sampleCompletedButUnscored: categories.completedButUnscored.slice(0, 10).map(pick => ({
        id: pick.id,
        user: pick.user.name || pick.user.email,
        game: `${pick.game.homeTeam} vs ${pick.game.awayTeam}`,
        week: `${pick.game.season}-W${pick.game.week}`,
        pickedTeam: pick.pickedTeam,
        lockedSpread: pick.lockedSpread,
        finalScore: `${pick.game.homeScore}-${pick.game.awayScore}`,
        currentSpread: pick.game.spread
      }))
    })

  } catch (error) {
    console.error('Error debugging picks:', error)
    return NextResponse.json({ error: 'Failed to debug picks' }, { status: 500 })
  }
}