import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { recalculateTournament } from '@/lib/golf-scoring'

// POST /api/admin/golf/recalculate
// Body: { tournamentId }
// Recalculates all round points and re-archives results.
// Required when picks are re-pointed after a merge-duplicates run on a completed tournament.
export async function POST(request: Request) {
  try {
    const current = await getCurrentUser()
    if (!current?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tournamentId } = await request.json()
    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 })
    }

    const tournament = await db.golfTournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true, status: true },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    await recalculateTournament(tournamentId)

    return NextResponse.json({
      success: true,
      tournament: tournament.name,
      status: tournament.status,
      message: tournament.status === 'COMPLETED'
        ? 'Points recalculated and leaderboard re-archived'
        : 'Points recalculated for completed rounds',
    })
  } catch (error) {
    console.error('Error recalculating tournament:', error)
    return NextResponse.json({ error: 'Recalculation failed', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}
