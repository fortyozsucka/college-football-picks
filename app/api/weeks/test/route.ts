import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple test endpoint to create week records and activate one
export async function POST(request: NextRequest) {
  try {
    // Get all unique week/season combinations from games
    const availableWeeks = await db.game.findMany({
      select: {
        week: true,
        season: true,
      },
      distinct: ['week', 'season'],
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    console.log('Available weeks from games:', availableWeeks)

    if (availableWeeks.length === 0) {
      return NextResponse.json({ error: 'No games found to create weeks from' }, { status: 400 })
    }

    // Create Week records for all available weeks
    const createdWeeks = []
    for (const { week, season } of availableWeeks) {
      const weekRecord = await db.week.upsert({
        where: {
          week_season: { week, season }
        },
        create: {
          week,
          season,
          isActive: false
        },
        update: {}
      })
      createdWeeks.push(weekRecord)
    }

    // Activate the most recent week
    if (createdWeeks.length > 0) {
      const mostRecentWeek = createdWeeks[0] // Already sorted by desc
      const updatedWeek = await db.week.update({
        where: { id: mostRecentWeek.id },
        data: { isActive: true }
      })
      console.log('Activated week:', updatedWeek)
    }

    return NextResponse.json({ 
      message: `Created ${createdWeeks.length} week records and activated the most recent week`,
      weeks: createdWeeks 
    })

  } catch (error) {
    console.error('Error in test endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}