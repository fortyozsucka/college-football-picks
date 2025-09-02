import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// Get available weeks from games (for admin to see what weeks exist)
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

    // Get unique week/season combinations from games using groupBy for reliable results
    const availableWeeks = await db.game.groupBy({
      by: ['week', 'season'],
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    // Get week activation status and game counts, creating Week records if they don't exist
    const weeksWithStatus = await Promise.all(
      availableWeeks.map(async ({ week, season }) => {
        const gameCount = await db.game.count({
          where: { week, season }
        })

        // Try to find existing week record, create if doesn't exist
        let weekStatus = await db.week.findUnique({
          where: {
            week_season: { week, season }
          }
        })

        if (!weekStatus) {
          // Create the week record as inactive by default
          weekStatus = await db.week.create({
            data: {
              week,
              season,
              isActive: false
            }
          })
        }

        return {
          week,
          season,
          isActive: weekStatus.isActive,
          gameCount
        }
      })
    )

    return NextResponse.json(weeksWithStatus)
  } catch (error) {
    console.error('Error fetching available weeks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}