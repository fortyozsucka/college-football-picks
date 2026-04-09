import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getESPNLeaderboard } from '@/lib/golf-api'
import { calculateRoundPoints, processRound2Cuts, calculateTournamentBonuses, archiveTournamentResults } from '@/lib/golf-scoring'

// Normalize name: strip accents, lowercase, keep only letters/numbers/hyphens
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ð/g, 'd').replace(/þ/g, 'th')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

function makeSlugId(name: string): string {
  return `slug:${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

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

    // Build a normalized name → golfer map for fuzzy matching
    const allGolfers = await db.golfer.findMany({ select: { id: true, fullName: true, espnId: true } })
    const golferByNorm = new Map(allGolfers.map(g => [normalizeName(g.fullName), g]))

    for (const entry of espnEntries) {
      const normalizedEntryName = normalizeName(entry.fullName)

      // 1. Check for slug placeholder by normalized slug (handles accented names)
      const slugId = makeSlugId(entry.fullName)
      let slugRecord = await db.golfer.findUnique({ where: { espnId: slugId } })

      // 2. If no slug found, also try matching by normalized full name (catches "Aberg" vs "Åberg")
      if (!slugRecord) {
        const byName = golferByNorm.get(normalizedEntryName)
        if (byName && byName.espnId.startsWith('slug:')) {
          slugRecord = await db.golfer.findUnique({ where: { id: byName.id } })
        }
      }

      if (slugRecord) {
        // Check if the real ESPN golfer already exists
        const existingReal = await db.golfer.findUnique({ where: { espnId: entry.espnPlayerId } })

        if (existingReal) {
          // Real record already exists — re-point slug's picks/scores to it, then delete slug
          await db.golfPick.updateMany({ where: { golferId: slugRecord.id }, data: { golferId: existingReal.id } })
          await db.golfRoundScore.updateMany({ where: { golferId: slugRecord.id }, data: { golferId: existingReal.id } })
          await db.golferTournamentOdds.updateMany({ where: { golferId: slugRecord.id }, data: { golferId: existingReal.id } })
          await db.golfer.delete({ where: { id: slugRecord.id } })
        } else {
          // No real record yet — update the slug record to become the real one
          await db.golfer.update({
            where: { id: slugRecord.id },
            data: {
              espnId: entry.espnPlayerId,
              fullName: entry.fullName,
              firstName: entry.firstName,
              lastName: entry.lastName,
              photoUrl: entry.photoUrl ?? undefined,
            },
          })
        }
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

      // Build a set of rounds ESPN has linescore data for
      const roundsWithScores = new Set(entry.roundScores.map((rs) => rs.round))

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
            totalScore: rs.cumulativeToPar,  // cumulative to-par as of this round
            position: entry.position,
            thru: entry.thru ?? null,
            missedCut: entry.missedCut,
            withdrawn: entry.withdrawn,
          },
          update: {
            score: entry.withdrawn ? null : rs.score,
            totalScore: rs.cumulativeToPar,  // cumulative to-par as of this round
            position: entry.position,
            thru: entry.thru ?? null,
            missedCut: entry.missedCut,
            withdrawn: entry.withdrawn,
          },
        })
      }

      // Clear stale scores for rounds ESPN has no linescore data yet
      // (handles players in the field who haven't teed off)
      for (const round of tournament.rounds) {
        if (roundsWithScores.has(round.roundNumber)) continue
        await db.golfRoundScore.updateMany({
          where: { roundId: round.id, golferId: golfer.id },
          data: { score: null, thru: null },
        })
      }
    }

    // Clear stale scores for picked golfers who are NOT in the ESPN field
    // (e.g. golfers added during testing but not actually in this tournament)
    const espnGolferIds = new Set(espnEntries.map(e => e.espnPlayerId))
    const roundIds = tournament.rounds.map(r => r.id)
    const pickedGolfers = await db.golfPick.findMany({
      where: { tournamentId },
      include: { golfer: true },
    })
    for (const pick of pickedGolfers) {
      if (!espnGolferIds.has(pick.golfer.espnId)) {
        await db.golfRoundScore.updateMany({
          where: { golferId: pick.golferId, roundId: { in: roundIds } },
          data: { score: null, totalScore: null, thru: null },
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
