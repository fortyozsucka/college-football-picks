import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyGolferByOdds } from '@/lib/golf-api'

export const dynamic = 'force-dynamic'

// GET /api/golf/odds?tournamentId=
// Returns golfers grouped by A/B/C for the picks UI
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 })
    }

    const odds = await db.golferTournamentOdds.findMany({
      where: { tournamentId },
      include: { golfer: true },
      orderBy: [{ group: 'asc' }, { odds: 'asc' }],
    })

    const grouped = {
      A: odds.filter((o) => o.group === 'A'),
      B: odds.filter((o) => o.group === 'B'),
      C: odds.filter((o) => o.group === 'C'),
    }

    return NextResponse.json(grouped)
  } catch (error) {
    console.error('Error fetching golf odds:', error)
    return NextResponse.json({ error: 'Failed to fetch odds' }, { status: 500 })
  }
}

// POST /api/golf/odds — admin: set/update odds for golfers in a tournament
// Body: { tournamentId, golfers: [{ espnId, firstName, lastName, fullName, odds }] }
export async function POST(request: Request) {
  try {
    const { tournamentId, golfers } = await request.json()

    if (!tournamentId || !Array.isArray(golfers) || golfers.length === 0) {
      return NextResponse.json({ error: 'tournamentId and golfers array are required' }, { status: 400 })
    }

    const results = await Promise.all(
      golfers.map(async (g: any) => {
        // If no espnId provided, generate a name-based placeholder so we can upsert.
        // The sync job will backfill real ESPN IDs by matching on fullName.
        const espnId = g.espnId && g.espnId !== ''
          ? g.espnId
          : `slug:${g.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

        // Try to find existing golfer by real espnId or by fullName (for slug-based records)
        let golfer = await db.golfer.findFirst({
          where: {
            OR: [
              { espnId },
              { fullName: g.fullName, espnId: { startsWith: 'slug:' } },
            ],
          },
        })

        if (golfer) {
          golfer = await db.golfer.update({
            where: { id: golfer.id },
            data: { espnId, fullName: g.fullName, photoUrl: g.photoUrl ?? undefined },
          })
        } else {
          golfer = await db.golfer.create({
            data: {
              espnId,
              firstName: g.firstName,
              lastName: g.lastName,
              fullName: g.fullName,
              country: g.country ?? null,
              photoUrl: g.photoUrl ?? null,
            },
          })
        }

        const group = classifyGolferByOdds(g.odds)

        // Upsert odds
        await db.golferTournamentOdds.upsert({
          where: { golferId_tournamentId: { golferId: golfer.id, tournamentId } },
          create: { golferId: golfer.id, tournamentId, odds: g.odds, group },
          update: { odds: g.odds, group },
        })

        return { espnId, fullName: g.fullName, odds: g.odds, group }
      })
    )

    return NextResponse.json({ success: true, count: results.length, golfers: results })
  } catch (error) {
    console.error('Error setting golf odds:', error)
    return NextResponse.json({ error: 'Failed to set odds' }, { status: 500 })
  }
}
