import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Get sync status information
export async function GET() {
  try {
    // Get the most recently updated game
    const latestGame = await db.game.findFirst({
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        updatedAt: true,
        season: true,
        week: true
      }
    })

    // Get sync stats by week
    const syncStats = await db.game.groupBy({
      by: ['season', 'week'],
      _min: {
        updatedAt: true
      },
      _max: {
        updatedAt: true
      },
      _count: {
        id: true
      },
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    // Get active weeks info
    const activeWeeks = await db.week.findMany({
      where: {
        isActive: true
      },
      select: {
        week: true,
        season: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      lastSync: latestGame?.updatedAt || null,
      lastSyncWeek: latestGame ? `Week ${latestGame.week} ${latestGame.season}` : null,
      activeWeeks: activeWeeks,
      syncStats: syncStats.map(stat => ({
        season: stat.season,
        week: stat.week,
        gameCount: stat._count.id,
        oldestSync: stat._min.updatedAt,
        newestSync: stat._max.updatedAt
      }))
    })

  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}