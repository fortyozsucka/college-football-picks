import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/golf/tournaments/[id]
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const tournament = await db.golfTournament.findUnique({
      where: { id: params.id },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            roundScores: {
              include: { golfer: true },
              orderBy: { position: 'asc' },
            },
          },
        },
        _count: { select: { golfPicks: true } },
      },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    return NextResponse.json(tournament)
  } catch (error) {
    console.error('Error fetching tournament:', error)
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 })
  }
}

// PATCH /api/golf/tournaments/[id] — admin: update status, cutLine, winningScore
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()

    const allowed = ['status', 'cutLine', 'winningScore', 'entryFee', 'isActive', 'endDate']
    const update: Record<string, any> = {}
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key]
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const tournament = await db.golfTournament.update({
      where: { id: params.id },
      data: update,
    })

    return NextResponse.json(tournament)
  } catch (error) {
    console.error('Error updating tournament:', error)
    return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 })
  }
}
