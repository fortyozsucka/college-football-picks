import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const headersList = headers()
    const cronSecret = headersList.get('Authorization')
    
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    
    // Determine if we're in football season (August through January)
    const currentMonth = now.getMonth() + 1 // 1-12
    const isFootballSeason = currentMonth >= 8 || currentMonth <= 1

    if (!isFootballSeason) {
      return NextResponse.json({
        message: 'Outside football season - skipping betting lines sync',
        timestamp: now.toISOString(),
        action: 'skipped'
      })
    }

    console.log('🎲 Starting automated betting lines sync...')

    // Get all active weeks that need betting line updates
    const activeWeeks = await db.week.findMany({
      where: {
        isActive: true
      },
      select: {
        week: true,
        season: true
      }
    })

    if (activeWeeks.length === 0) {
      return NextResponse.json({
        message: 'No active weeks found - skipping betting lines sync',
        timestamp: now.toISOString(),
        action: 'skipped'
      })
    }

    console.log(`Found ${activeWeeks.length} active weeks to sync:`, activeWeeks)

    // Sync betting lines for each active week
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'https://squadtriangle.com'
    const syncResults = []

    for (const weekData of activeWeeks) {
      try {
        console.log(`🎯 Syncing betting lines for Week ${weekData.week}, Season ${weekData.season}`)

        const syncUrl = `${baseUrl}/api/games/sync?week=${weekData.week}&season=${weekData.season}`
        console.log(`📡 Calling internal sync URL: ${syncUrl}`)

        const syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Cron-Betting-Lines-Sync'
          },
          timeout: 30000 // 30 second timeout
        })

        if (!syncResponse.ok) {
          throw new Error(`Sync failed for Week ${weekData.week}: ${syncResponse.statusText}`)
        }

        const syncResult = await syncResponse.json()
        syncResults.push({
          week: weekData.week,
          season: weekData.season,
          success: true,
          result: syncResult
        })

        console.log(`✅ Successfully synced Week ${weekData.week}, Season ${weekData.season}`)
        
        // Add small delay between requests to be respectful to the CFB API
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Failed to sync Week ${weekData.week}, Season ${weekData.season}:`, {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        })
        syncResults.push({
          week: weekData.week,
          season: weekData.season,
          success: false,
          error: errorMessage
        })
      }
    }

    // Calculate summary stats
    const successful = syncResults.filter(r => r.success).length
    const failed = syncResults.filter(r => !r.success).length
    const totalGamesUpdated = syncResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.result?.gamesUpdated || 0), 0)

    console.log(`🏁 Betting lines sync completed: ${successful}/${syncResults.length} weeks successful, ${totalGamesUpdated} games updated`)

    return NextResponse.json({
      message: 'Automated betting lines sync completed',
      timestamp: now.toISOString(),
      summary: {
        activeWeeks: activeWeeks.length,
        successful,
        failed,
        totalGamesUpdated
      },
      details: syncResults
    })

  } catch (error) {
    console.error('❌ Automated betting lines sync failed:', error)
    return NextResponse.json(
      { 
        error: 'Automated betting lines sync failed',
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