import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/golf/field?tournamentId=
// Returns the actual tournament leaderboard (all golfers, not just picked ones)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

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

    // Get all round scores for this tournament
    const roundScores = await db.golfRoundScore.findMany({
      where: { round: { tournamentId } },
      include: {
        golfer: true,
        round: true,
      },
      orderBy: { round: { roundNumber: 'asc' } },
    })

    if (roundScores.length === 0) {
      return NextResponse.json({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          season: tournament.season,
          rounds: tournament.rounds,
        },
        field: [],
      })
    }

    // Get picked golfer IDs so we can highlight them
    const picks = await db.golfPick.findMany({
      where: { tournamentId },
      select: { golferId: true, userId: true },
    })
    const pickedGolferIds = new Set(picks.map(p => p.golferId))

    // Build per-golfer standings
    const golferMap = new Map<string, any>()

    for (const rs of roundScores) {
      if (!golferMap.has(rs.golferId)) {
        golferMap.set(rs.golferId, {
          golferId: rs.golferId,
          fullName: rs.golfer.fullName,
          photoUrl: rs.golfer.photoUrl,
          isPicked: pickedGolferIds.has(rs.golferId),
          position: null,
          totalScore: null,
          missedCut: false,
          withdrawn: false,
          rounds: {},
        })
      }

      const entry = golferMap.get(rs.golferId)
      entry.rounds[rs.round.roundNumber] = {
        score: rs.score,
        status: rs.round.status,
        withdrawn: rs.withdrawn,
      }

      // Use the latest round's position and totalScore
      if (rs.score !== null || rs.withdrawn || rs.missedCut) {
        entry.totalScore = rs.totalScore
        entry.position = rs.position
        if (rs.missedCut) entry.missedCut = true
        if (rs.withdrawn) entry.withdrawn = true
      }
    }

    // Sort: active players by position, WD at bottom, MC above WD
    const field = Array.from(golferMap.values()).sort((a, b) => {
      const aOut = a.withdrawn || a.missedCut
      const bOut = b.withdrawn || b.missedCut
      if (aOut && !bOut) return 1
      if (!aOut && bOut) return -1
      // Both out: WD after MC
      if (a.withdrawn && !b.withdrawn) return 1
      if (!a.withdrawn && b.withdrawn) return -1
      if (a.position !== null && b.position !== null) return a.position - b.position
      return 0
    })

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        season: tournament.season,
        rounds: tournament.rounds,
      },
      field,
    })
  } catch (error) {
    console.error('Error fetching field:', error)
    return NextResponse.json({ error: 'Failed to fetch field' }, { status: 500 })
  }
}
