import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getESPNLeaderboard } from '@/lib/golf-api'
import { calculateRoundPoints, processRound2Cuts, calculateTournamentBonuses, archiveTournamentResults } from '@/lib/golf-scoring'

// POST /api/golf/sync — admin/cron: pull latest scores from ESPN and update DB
// Body: { tournamentId } — uses the tournament's espnId to fetch from ESPN
export async function POST(request: Request) {
  try {
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

    // Fetch live leaderboard from ESPN
    const espnEntries = await getESPNLeaderboard(tournament.espnId)

    if (espnEntries.length === 0) {
      return NextResponse.json({ error: 'No leaderboard data returned from ESPN' }, { status: 502 })
    }

    // Determine current round from ESPN data
    const maxRound = Math.max(...espnEntries.map((e) => e.currentRound).filter(Boolean), 1)
    const tournamentCompleted = espnEntries.every((e) => e.thru === 'F' || e.missedCut)

    // Sync golfer records and round scores
    const syncedRounds = new Set<number>()

    for (const entry of espnEntries) {
      // Check if a slug placeholder exists for this golfer and update it first
      // so we don't create a duplicate real-ESPN record alongside it
      const slugId = `slug:${entry.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      const slugRecord = await db.golfer.findUnique({ where: { espnId: slugId } })
      if (slugRecord) {
        await db.golfer.update({
          where: { id: slugRecord.id },
          data: { espnId: entry.espnPlayerId, photoUrl: entry.photoUrl ?? undefined },
        })
      }

      // Upsert golfer by real ESPN ID
      const golfer = await db.golfer.upsert({
        where: { espnId: entry.espnPlayerId },
        create: {
          espnId: entry.espnPlayerId,
          firstName: entry.firstName,
          lastName: entry.lastName,
          fullName: entry.fullName,
          photoUrl: entry.photoUrl,
        },
        update: { photoUrl: entry.photoUrl ?? undefined },
      })

      // Sync each round score this golfer has played
      for (const rs of entry.roundScores) {
        const round = tournament.rounds.find((r) => r.roundNumber === rs.round)
        if (!round) continue

        syncedRounds.add(rs.round)

        await db.golfRoundScore.upsert({
          where: { roundId_golferId: { roundId: round.id, golferId: golfer.id } },
          create: {
            roundId: round.id,
            golferId: golfer.id,
            score: entry.withdrawn ? null : rs.score,
            totalScore: entry.totalScore,
            position: entry.position,
            missedCut: entry.missedCut,
            withdrawn: entry.withdrawn,
          },
          update: {
            score: entry.withdrawn ? null : rs.score,
            totalScore: entry.totalScore,
            position: entry.position,
            missedCut: entry.missedCut,
            withdrawn: entry.withdrawn,
          },
        })
      }
    }

    // Update round statuses and calculate points for completed rounds
    const completedRoundNumbers = Array.from(syncedRounds).filter((rn) => {
      // A round is complete if all players are past it or it's before the current round
      return rn < maxRound || tournamentCompleted
    })

    for (const roundNumber of completedRoundNumbers) {
      const round = tournament.rounds.find((r) => r.roundNumber === roundNumber)
      if (!round || round.isCompleted) continue

      await db.golfRound.update({
        where: { id: round.id },
        data: { isCompleted: true, status: 'COMPLETED' },
      })

      await calculateRoundPoints(round.id)

      if (roundNumber === 2) {
        await processRound2Cuts(tournamentId)
      }
    }

    // Mark current round as in-progress
    const currentRound = tournament.rounds.find((r) => r.roundNumber === maxRound)
    if (currentRound && !currentRound.isCompleted) {
      await db.golfRound.update({
        where: { id: currentRound.id },
        data: { status: 'IN_PROGRESS' },
      })
      // Calculate live points for current round too
      await calculateRoundPoints(currentRound.id)
    }

    // Update tournament status
    let newStatus = tournament.status
    if (tournamentCompleted && tournament.status !== 'COMPLETED') {
      newStatus = 'COMPLETED'
      await db.golfTournament.update({
        where: { id: tournamentId },
        data: { status: 'COMPLETED' },
      })
      await calculateTournamentBonuses(tournamentId)
      await archiveTournamentResults(tournamentId)
    } else if (maxRound >= 1 && tournament.status === 'UPCOMING') {
      newStatus = 'IN_PROGRESS'
      await db.golfTournament.update({
        where: { id: tournamentId },
        data: { status: 'IN_PROGRESS' },
      })
    }

    return NextResponse.json({
      success: true,
      playersSync: espnEntries.length,
      roundsSynced: Array.from(syncedRounds).sort(),
      currentRound: maxRound,
      tournamentStatus: newStatus,
    })
  } catch (error) {
    console.error('Error syncing golf tournament:', error)
    return NextResponse.json({ error: 'Failed to sync tournament' }, { status: 500 })
  }
}

// GET /api/golf/sync — returns sync status for all active tournaments
export async function GET() {
  try {
    const active = await db.golfTournament.findMany({
      where: { status: { in: ['UPCOMING', 'IN_PROGRESS'] }, isActive: true },
      include: {
        rounds: { orderBy: { roundNumber: 'asc' } },
        _count: { select: { golfPicks: true } },
      },
    })

    return NextResponse.json(active)
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 })
  }
}
