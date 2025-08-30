import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (prevents unauthorized access)
    const headersList = headers()
    const cronSecret = headersList.get('Authorization')
    
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current time to determine sync frequency
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
    const hour = now.getHours()
    
    // Determine if we're in football season (August through January)
    const currentMonth = now.getMonth() + 1 // 1-12
    const isFootballSeason = currentMonth >= 8 || currentMonth <= 1

    if (!isFootballSeason) {
      return NextResponse.json({
        message: 'Outside football season - skipping sync',
        timestamp: now.toISOString(),
        action: 'skipped'
      })
    }

    // Game day logic: More frequent syncing on Saturdays and Sundays during game hours
    const isGameDay = dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
    const isGameTime = hour >= 9 && hour <= 23 // 9 AM to 11 PM

    let syncReason = 'scheduled_sync'
    
    if (isGameDay && isGameTime) {
      syncReason = 'game_day_sync'
    } else if (isGameDay) {
      syncReason = 'game_day_maintenance'  
    } else {
      syncReason = 'regular_maintenance'
    }

    // Call the existing sync endpoint internally
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const syncResponse = await fetch(`${baseUrl}/api/games/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cron-Job-Sync'
      }
    })

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResponse.statusText}`)
    }

    const syncResult = await syncResponse.json()

    // Log the sync for monitoring
    console.log(`🤖 Automated sync completed:`, {
      timestamp: now.toISOString(),
      reason: syncReason,
      isGameDay,
      isGameTime,
      result: syncResult
    })

    return NextResponse.json({
      message: 'Automated sync completed successfully',
      timestamp: now.toISOString(),
      reason: syncReason,
      isGameDay,
      isGameTime,
      result: syncResult
    })

  } catch (error) {
    console.error('Automated sync failed:', error)
    return NextResponse.json(
      { 
        error: 'Automated sync failed',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Allow POST requests too for manual triggering
  return GET(request)
}