import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season')

    if (season) {
      // Get specific season stats
      const seasonStats = await db.historicalStats.findMany({
        where: { season: parseInt(season) },
        orderBy: { rank: 'asc' }
      })

      if (seasonStats.length === 0) {
        return NextResponse.json(
          { error: `No archived stats found for season ${season}` },
          { status: 404 }
        )
      }

      return NextResponse.json({
        season: parseInt(season),
        stats: seasonStats,
        totalUsers: seasonStats[0]?.totalUsers || 0,
        archivedAt: seasonStats[0]?.archivedAt
      })
    } else {
      // Get summary of all available seasons
      const availableSeasons = await db.historicalStats.findMany({
        select: { 
          season: true,
          archivedAt: true
        },
        distinct: ['season'],
        orderBy: { season: 'desc' }
      })

      const seasonSummaries = await Promise.all(
        availableSeasons.map(async ({ season, archivedAt }) => {
          const champion = await db.historicalStats.findFirst({
            where: { season, rank: 1 },
            select: { userName: true, finalScore: true, totalUsers: true }
          })

          return {
            season,
            champion: champion?.userName || 'Unknown',
            championScore: champion?.finalScore || 0,
            totalUsers: champion?.totalUsers || 0,
            archivedAt
          }
        })
      )

      return NextResponse.json({
        seasons: seasonSummaries
      })
    }
  } catch (error) {
    console.error('Error fetching historical stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical stats' },
      { status: 500 }
    )
  }
}