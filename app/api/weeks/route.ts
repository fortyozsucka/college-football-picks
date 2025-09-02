import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// Get all weeks
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all unique week/season combinations that have games
    const gamesWithWeeks = await db.game.groupBy({
      by: ['week', 'season'],
      _count: {
        id: true
      },
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    // Get existing week records
    const existingWeeks = await db.week.findMany({
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    // Create a map for quick lookup of existing week records
    const weekMap = new Map()
    existingWeeks.forEach(week => {
      weekMap.set(`${week.week}-${week.season}`, week)
    })

    // Combine games data with existing week records
    const allWeeks = gamesWithWeeks.map(gameWeek => {
      const key = `${gameWeek.week}-${gameWeek.season}`
      const existingWeek = weekMap.get(key)
      
      return {
        id: existingWeek?.id || null,
        week: gameWeek.week,
        season: gameWeek.season,
        isActive: existingWeek?.isActive || false,
        gameCount: gameWeek._count.id,
        createdAt: existingWeek?.createdAt || null,
        updatedAt: existingWeek?.updatedAt || null
      }
    })

    return NextResponse.json(allWeeks)
  } catch (error) {
    console.error('Error fetching weeks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create or update week activation
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { week, season, isActive } = await request.json()

    if (typeof week !== 'number' || typeof season !== 'number' || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Upsert the week record
    const weekRecord = await db.week.upsert({
      where: {
        week_season: {
          week,
          season
        }
      },
      update: {
        isActive
      },
      create: {
        week,
        season,
        isActive
      }
    })

    return NextResponse.json(weekRecord)
  } catch (error) {
    console.error('Error updating week:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}