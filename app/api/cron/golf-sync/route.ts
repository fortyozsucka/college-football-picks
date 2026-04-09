import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const headersList = headers()
    const cronSecret = headersList.get('Authorization')

    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Golf cron: unauthorized — check CRON_SECRET env var and Authorization header in cron-job.org')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const activeTournaments = await db.golfTournament.findMany({
      where: { status: 'IN_PROGRESS', isActive: true },
    })

    if (activeTournaments.length === 0) {
      console.log('Golf cron: no IN_PROGRESS tournaments found')
      return NextResponse.json({ message: 'No active golf tournaments', action: 'skipped', timestamp: now.toISOString() })
    }

    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
    const baseUrl = (process.env.NEXTAUTH_URL || `${protocol}://${host}`).replace(/\/$/, '')
    console.log(`Golf cron: syncing ${activeTournaments.length} tournament(s) via ${baseUrl}/api/golf/sync`)

    const results = []

    for (const tournament of activeTournaments) {
      try {
        const res = await fetch(`${baseUrl}/api/golf/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournamentId: tournament.id }),
        })

        const text = await res.text()
        console.log(`Golf cron sync response [${res.status}] for ${tournament.name}: ${text.substring(0, 200)}`)

        const data = JSON.parse(text)
        results.push({ tournament: tournament.name, status: res.status, ...data })
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

export async function POST() {
  return GET()
}
