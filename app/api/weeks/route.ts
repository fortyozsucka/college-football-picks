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
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all weeks and their game counts
    const weeks = await db.week.findMany({
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    // Get game counts for each week
    const weeksWithGameCounts = await Promise.all(
      weeks.map(async (week) => {
        const gameCount = await db.game.count({
          where: {
            season: week.season,
            week: week.week
          }
        })
        return {
          ...week,
          gameCount
        }
      })
    )

    return NextResponse.json(weeksWithGameCounts)
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
    const user = await db.user.findUnique({
      where: { id: payload.userId },
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