import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/admin/golf/reset-tournament
// Body: { tournamentId }
// Resets a tournament that was incorrectly marked COMPLETED back to IN_PROGRESS.
// Also fixes any round statuses that are inconsistent.
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
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Reset tournament to IN_PROGRESS
    await db.golfTournament.update({
      where: { id: tournamentId },
      data: { status: 'IN_PROGRESS' },
    })

    // Fix round statuses: completed rounds stay completed, the last non-completed round
    // gets set to IN_PROGRESS, future rounds stay NOT_STARTED
    const completedRounds = tournament.rounds.filter(r => r.isCompleted)
    const notCompletedRounds = tournament.rounds.filter(r => !r.isCompleted)

    // Ensure all isCompleted rounds have status=COMPLETED
    for (const round of completedRounds) {
      if (round.status !== 'COMPLETED') {
        await db.golfRound.update({
          where: { id: round.id },
          data: { status: 'COMPLETED' },
        })
      }
    }

    // Set the first non-completed round to IN_PROGRESS, rest to NOT_STARTED
    for (let i = 0; i < notCompletedRounds.length; i++) {
      const round = notCompletedRounds[i]
      const targetStatus = i === 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
      if (round.status !== targetStatus) {
        await db.golfRound.update({
          where: { id: round.id },
          data: { status: targetStatus },
        })
      }
    }

    const nextRound = notCompletedRounds[0]
    return NextResponse.json({
      success: true,
      tournamentStatus: 'IN_PROGRESS',
      currentRound: nextRound?.roundNumber ?? null,
      completedRounds: completedRounds.map(r => r.roundNumber),
    })
  } catch (error) {
    console.error('Error resetting tournament:', error)
    return NextResponse.json({ error: 'Failed to reset tournament' }, { status: 500 })
  }
}
