import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get all users with their picks (we'll calculate and sort by score afterwards)
    const leaderboard = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
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
      }
    })

    // Calculate additional stats for each user
    const leaderboardWithStats = leaderboard.map(user => {
      const completedPicks = user.picks.filter(pick => pick.points !== null)

      // Calculate actual total score from picks (same as weekly picks route)
      // This ensures the leaderboard always shows the correct current score
      const actualTotalScore = completedPicks.reduce((sum, pick) => sum + (pick.points || 0), 0)

      // Use the new result field for accurate win/loss/push tracking, with fallback to points
      const wins = completedPicks.filter(pick => {
        if (pick.result) {
          return pick.result === 'win'
        }
        // Fallback: wins are positive points
        return pick.points && pick.points > 0
      }).length

      const losses = completedPicks.filter(pick => {
        if (pick.result) {
          return pick.result === 'loss'
        }
        // Fallback: losses are negative points OR 0 points for non-double-down picks
        if (pick.points === -1) return true
        if (pick.points === 0 && !pick.isDoubleDown) {
          // For legacy data, we can't distinguish between loss and push for 0-point normal picks
          // We'll count them as losses for now
          return true
        }
        return false
      }).length

      const pushes = completedPicks.filter(pick => {
        if (pick.result) {
          return pick.result === 'push'
        }
        // Fallback: for legacy data, we can't reliably identify pushes
        // We'll show 0 pushes for old data
        return false
      }).length
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
        totalScore: actualTotalScore, // Use calculated score instead of cached user.totalScore
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

    // Sort by calculated total score (instead of cached user.totalScore)
    const sortedLeaderboard = leaderboardWithStats.sort((a, b) => b.totalScore - a.totalScore)

    return NextResponse.json(sortedLeaderboard)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}