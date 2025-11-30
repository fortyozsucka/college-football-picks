import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get('week')
    const seasonParam = searchParams.get('season')

    if (!weekParam || !seasonParam) {
      return NextResponse.json(
        { error: 'Week and season are required' },
        { status: 400 }
      )
    }

    const week = parseInt(weekParam)
    const season = parseInt(seasonParam)
    const userId = params.id

    // Get all picks for this user, week, and season with game details
    const picks = await db.pick.findMany({
      where: {
        userId,
        game: {
          week,
          season
        }
      },
      include: {
        game: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            spread: true,
            completed: true,
            startTime: true,
            week: true,
            season: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Calculate statistics for this week
    const stats = {
      totalPicks: picks.length,
      wins: picks.filter(p => p.result === 'win').length,
      losses: picks.filter(p => p.result === 'loss').length,
      pushes: picks.filter(p => p.result === 'push').length,
      pending: picks.filter(p => p.result === 'pending').length,
      totalPoints: picks.reduce((sum, p) => sum + (p.points || 0), 0),
      doubleDowns: picks.filter(p => p.isDoubleDown).length,
      doubleDownWins: picks.filter(p => p.isDoubleDown && p.result === 'win').length
    }

    return NextResponse.json({
      picks: picks.map(pick => ({
        id: pick.id,
        selectedTeam: pick.pickedTeam,
        isDoubleDown: pick.isDoubleDown,
        result: pick.result,
        points: pick.points,
        createdAt: pick.createdAt,
        game: pick.game,
      })),
      stats,
      user: picks[0]?.user || null,
      week,
      season
    })

  } catch (error) {
    console.error('Error fetching weekly picks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly picks' },
      { status: 500 }
    )
  }
}
