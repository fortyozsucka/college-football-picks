import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isMajorOrPlayers } from '@/lib/golf-api'

export const dynamic = 'force-dynamic'

// GET /api/golf/tournaments?season=2025
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season')

    const tournaments = await db.golfTournament.findMany({
      where: {
        isActive: true,
        ...(season && { season: parseInt(season) }),
      },
      include: {
        rounds: { orderBy: { roundNumber: 'asc' } },
        _count: { select: { golfPicks: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error('Error fetching golf tournaments:', error)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}

// POST /api/golf/tournaments — admin: create a tournament
export async function POST(request: Request) {
  try {
    const { espnId, name, startDate, endDate, season, entryFee } = await request.json()

    if (!espnId || !name || !startDate || !season) {
      return NextResponse.json({ error: 'espnId, name, startDate, and season are required' }, { status: 400 })
    }

    const existing = await db.golfTournament.findUnique({ where: { espnId } })
    if (existing) {
      return NextResponse.json({ error: 'Tournament with this ESPN ID already exists' }, { status: 400 })
    }

    const { type } = isMajorOrPlayers(name)

    const tournament = await db.golfTournament.create({
      data: {
        espnId,
        name,
        tournamentType: type ?? 'MAJOR',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : new Date(startDate),
        season: parseInt(season),
        status: 'UPCOMING',
        ...(entryFee != null && entryFee !== '' && { entryFee: parseFloat(entryFee) }),
      },
    })

    // Pre-create the 4 round records
    await db.golfRound.createMany({
      data: [1, 2, 3, 4].map((n) => ({
        tournamentId: tournament.id,
        roundNumber: n,
        roundDate: new Date(startDate),
        status: 'NOT_STARTED',
      })),
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    console.error('Error creating golf tournament:', error)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}
