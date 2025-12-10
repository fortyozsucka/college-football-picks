import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Admin endpoint to sync and activate postseason games
 * This will fetch all postseason games (bowl games, playoffs, Army-Navy) and create week records
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
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

    const { season, autoActivate } = await request.json()

    // Use same season logic as game sync
    const now = new Date()
    const year = now.getFullYear()
    const currentSeason = now.getMonth() >= 7 ? year : year - 1
    const targetSeason = season || currentSeason

    console.log(`🏈 Admin sync: Syncing postseason games for ${targetSeason}`)
    console.log(`   Current date: ${now.toLocaleDateString()}, Detected season: ${currentSeason}`)

    // Build the URL - use request URL's origin for production compatibility
    const requestUrl = new URL(request.url)
    const baseUrl = process.env.NEXTAUTH_URL || `${requestUrl.protocol}//${requestUrl.host}`
    const syncUrl = `${baseUrl}/api/games/sync?season=${targetSeason}&week=16&postseason=true`

    console.log(`📡 Calling sync endpoint: ${syncUrl}`)

    let syncResponse
    try {
      syncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      throw new Error(`Network error calling sync endpoint: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
    }

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      console.error(`❌ Sync endpoint returned ${syncResponse.status}: ${errorText}`)
      throw new Error(`Sync failed with status ${syncResponse.status}: ${errorText}`)
    }

    let syncResult
    try {
      syncResult = await syncResponse.json()
    } catch (parseError) {
      console.error('❌ Failed to parse sync response:', parseError)
      throw new Error('Invalid JSON response from sync endpoint')
    }

    console.log(`✅ Sync completed:`, syncResult)

    // Find all unique weeks that now have postseason games
    const postseasonWeeks = await db.game.groupBy({
      by: ['week', 'season'],
      where: {
        season: targetSeason,
        gameType: {
          in: ['BOWL', 'PLAYOFF', 'ARMY_NAVY', 'CHAMPIONSHIP']
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        week: 'asc'
      }
    })

    console.log(`📊 Found postseason games in ${postseasonWeeks.length} weeks`)

    // Optionally auto-activate these weeks
    let activatedWeeks = []
    if (autoActivate) {
      for (const weekData of postseasonWeeks) {
        const weekRecord = await db.week.upsert({
          where: {
            week_season: {
              week: weekData.week,
              season: weekData.season
            }
          },
          update: {
            isActive: true
          },
          create: {
            week: weekData.week,
            season: weekData.season,
            isActive: true
          }
        })
        activatedWeeks.push(weekRecord)
        console.log(`✅ Activated Week ${weekData.week} (${weekData._count.id} games)`)
      }
    }

    return NextResponse.json({
      success: true,
      season: targetSeason,
      sync: syncResult,
      postseasonWeeks: postseasonWeeks.map(w => ({
        week: w.week,
        gameCount: w._count.id
      })),
      activatedWeeks: activatedWeeks.length,
      message: autoActivate
        ? `Synced and activated ${activatedWeeks.length} postseason weeks`
        : `Synced postseason games. Use the admin panel to activate weeks.`
    })

  } catch (error) {
    console.error('❌ Error in postseason sync:', error)

    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync postseason games',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Admin postseason sync endpoint',
    usage: 'POST with { season: 2024, autoActivate: true }',
    description: 'Syncs all postseason games (bowl games, playoffs, Army-Navy) and optionally activates the weeks',
    parameters: {
      season: 'Year to sync (defaults to current year)',
      autoActivate: 'Set to true to automatically activate weeks with postseason games'
    }
  })
}
