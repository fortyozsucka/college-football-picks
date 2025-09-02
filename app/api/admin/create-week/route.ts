import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { week, season, isActive } = await request.json()

    // Validate input
    if (!week || !season) {
      return NextResponse.json(
        { error: 'Week and season are required' },
        { status: 400 }
      )
    }

    // Check if week already exists
    const existingWeek = await db.week.findUnique({
      where: {
        week_season: { week, season }
      }
    })

    if (existingWeek) {
      return NextResponse.json(
        { error: `Week ${week} Season ${season} already exists` },
        { status: 400 }
      )
    }

    // Check if games exist for this week
    const gameCount = await db.game.count({
      where: { week, season }
    })

    // Create the week record
    const newWeek = await db.week.create({
      data: {
        week,
        season,
        isActive: isActive || false
      }
    })

    return NextResponse.json({
      success: true,
      message: `Week ${week} Season ${season} created successfully`,
      week: newWeek,
      gameCount
    })

  } catch (error) {
    console.error('Error creating week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Create Week Endpoint',
    usage: 'POST with { week: 2, season: 2025, isActive: false }',
    description: 'Creates a week record so it appears in admin controls'
  })
}