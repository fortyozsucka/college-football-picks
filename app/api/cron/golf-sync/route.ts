import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const cronSecret = headersList.get('Authorization')

    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all in-progress golf tournaments
    const activeTournaments = await db.golfTournament.findMany({
      where: { status: 'IN_PROGRESS', isActive: true },
    })

    if (activeTournaments.length === 0) {
      return NextResponse.json({ message: 'No active golf tournaments', action: 'skipped', timestamp: now.toISOString() })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const results = []

    for (const tournament of activeTournaments) {
      try {
        // Delegate to the main sync endpoint so all fixes stay in one place
        const res = await fetch(`${baseUrl}/api/golf/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournamentId: tournament.id }),
        })

        const data = await res.json()
        results.push({ tournament: tournament.name, ...data })
        console.log(`⛳ Golf cron sync: ${tournament.name}`, data)
      } catch (err) {
        console.error(`Golf cron sync failed for ${tournament.name}:`, err)
        results.push({ tournament: tournament.name, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({ message: 'Golf cron sync completed', timestamp: now.toISOString(), results })
  } catch (error) {
    console.error('Golf cron sync failed:', error)
    return NextResponse.json({ error: 'Golf cron sync failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
