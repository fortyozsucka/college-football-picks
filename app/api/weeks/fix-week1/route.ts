import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Utility to fix Week 1 and analyze game dates
export async function POST(request: NextRequest) {
  try {
    // First, let's analyze Week 1 game dates
    const week1Games = await db.game.findMany({
      where: {
        week: 1,
        season: 2025
      },
      select: {
        startTime: true,
        homeTeam: true,
        awayTeam: true
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    if (week1Games.length === 0) {
      return NextResponse.json({ error: 'No Week 1 games found' }, { status: 400 })
    }

    // Get date range
    const startDate = new Date(week1Games[0].startTime)
    const endDate = new Date(week1Games[week1Games.length - 1].startTime)
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))

    // Fix the week activation - activate Week 1, deactivate Week 2
    await db.week.updateMany({
      where: {
        season: 2025,
        week: 2
      },
      data: { isActive: false }
    })

    await db.week.updateMany({
      where: {
        season: 2025,
        week: 1
      },
      data: { isActive: true }
    })

    return NextResponse.json({
      message: 'Week 1 reactivated and Week 2 deactivated',
      week1Analysis: {
        totalGames: week1Games.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationDays: daysDiff,
        firstGame: `${week1Games[0].awayTeam} @ ${week1Games[0].homeTeam}`,
        lastGame: `${week1Games[week1Games.length - 1].awayTeam} @ ${week1Games[week1Games.length - 1].homeTeam}`
      }
    })

  } catch (error) {
    console.error('Error fixing Week 1:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}