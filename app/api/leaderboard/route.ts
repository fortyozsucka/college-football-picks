import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get all users with their total scores, ordered by totalScore descending
    const leaderboard = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        totalScore: true,
        picks: {
          select: {
            points: true,
            result: true,
            isDoubleDown: true,
            game: {
              select: {
                week: true,
                season: true,
                completed: true
              }
            }
          },
          where: {
            points: {
              not: null
            }
          }
        }
      },
      orderBy: {
        totalScore: 'desc'
      }
    })

    // Calculate additional stats for each user
    const leaderboardWithStats = leaderboard.map(user => {
      const completedPicks = user.picks.filter(pick => pick.points !== null)
      
      // Use the new result field for accurate win/loss/push tracking
      const wins = completedPicks.filter(pick => pick.result === 'win').length
      const losses = completedPicks.filter(pick => pick.result === 'loss').length
      const pushes = completedPicks.filter(pick => pick.result === 'push').length
      const doubleDowns = completedPicks.filter(pick => pick.isDoubleDown).length
      const doubleDownWins = completedPicks.filter(pick => pick.isDoubleDown && pick.points && pick.points > 0).length

      // Calculate weekly breakdown
      const weeklyStats = completedPicks.reduce((acc, pick) => {
        const key = `${pick.game.season}-${pick.game.week}`
        if (!acc[key]) {
          acc[key] = { picks: 0, points: 0, week: pick.game.week, season: pick.game.season }
        }
        acc[key].picks++
        acc[key].points += pick.points || 0
        return acc
      }, {} as Record<string, { picks: number, points: number, week: number, season: number }>)

      return {
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        totalScore: user.totalScore,
        totalPicks: completedPicks.length,
        wins,
        losses,
        pushes,
        winPercentage: completedPicks.length > 0 ? ((wins / completedPicks.length) * 100) : 0,
        doubleDowns,
        doubleDownWins,
        weeklyStats: Object.values(weeklyStats).sort((a, b) => {
          if (a.season !== b.season) return b.season - a.season
          return b.week - a.week
        })
      }
    })

    return NextResponse.json(leaderboardWithStats)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}