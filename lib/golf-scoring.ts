import { db } from './db'

// ─── Round Scoring ────────────────────────────────────────────────────────────

/**
 * Calculate and store points for every pick in a given round.
 * - Best to-par score = 20 pts
 * - Each shot-to-par behind leader = -2 pts (floor 0)
 * - Golfer missed cut (R3/R4) = 0 pts
 * - User was cut after R2 (last place) = 0 pts for R3/R4
 *
 * Uses totalScore (to-par) not raw strokes so live scoring is fair across
 * players who have played different numbers of holes mid-round.
 * Players with null totalScore (haven't teed off) earn 0 pts.
 */
export async function calculateRoundPoints(roundId: string): Promise<void> {
  const round = await db.golfRound.findUnique({
    where: { id: roundId },
    include: { roundScores: true },
  })
  if (!round) throw new Error(`Round ${roundId} not found`)

  // Only include golfers who have a to-par score for this round (have teed off, didn't MC or WD)
  const playedScores = round.roundScores.filter(
    (rs) => rs.totalScore !== null && !rs.missedCut && !rs.withdrawn
  )

  // Best (lowest/most negative) to-par among those who have played
  const bestScore = playedScores.length > 0
    ? Math.min(...playedScores.map((rs) => rs.totalScore!))
    : null

  // Get all picks for this tournament
  const picks = await db.golfPick.findMany({
    where: { tournamentId: round.tournamentId },
  })

  const upserts = picks.map(async (pick) => {
    let points = 0

    // User was cut after R2 — zero points for R3/R4
    if (round.roundNumber >= 3 && pick.isUserCut) {
      return db.golfPickRoundPoints.upsert({
        where: { pickId_roundId: { pickId: pick.id, roundId } },
        create: { pickId: pick.id, roundId, points: 0 },
        update: { points: 0 },
      })
    }

    const golferScore = round.roundScores.find((rs) => rs.golferId === pick.golferId)

    // Golfer missed the cut or withdrew — zero points (MC only applies R3+, WD applies any round)
    const noScore = golferScore?.withdrawn ||
      (round.roundNumber >= 3 && golferScore?.missedCut)
    if (noScore) {
      return db.golfPickRoundPoints.upsert({
        where: { pickId_roundId: { pickId: pick.id, roundId } },
        create: { pickId: pick.id, roundId, points: 0 },
        update: { points: 0 },
      })
    }

    // Golfer has a to-par score this round — calculate points
    if (golferScore?.totalScore !== null && golferScore?.totalScore !== undefined && bestScore !== null) {
      const shotsBehind = golferScore.totalScore - bestScore
      points = Math.max(0, 20 - shotsBehind * 2)
    }

    return db.golfPickRoundPoints.upsert({
      where: { pickId_roundId: { pickId: pick.id, roundId } },
      create: { pickId: pick.id, roundId, points },
      update: { points },
    })
  })

  await Promise.all(upserts)
}

// ─── Round 2 Cut Processing ───────────────────────────────────────────────────

/**
 * After R2 completes: find the user(s) in last place and mark their picks
 * as isUserCut = true. Those users earn 0 points for R3 and R4.
 * Returns the list of cut user IDs.
 */
export async function processRound2Cuts(tournamentId: string): Promise<string[]> {
  const picks = await db.golfPick.findMany({
    where: { tournamentId },
    include: {
      roundPoints: {
        include: { round: true },
        where: { round: { roundNumber: { lte: 2 } } },
      },
    },
  })

  // Sum R1 + R2 points per user
  const userPoints = new Map<string, number>()
  for (const pick of picks) {
    const pts = pick.roundPoints.reduce((sum, rp) => sum + rp.points, 0)
    userPoints.set(pick.userId, (userPoints.get(pick.userId) ?? 0) + pts)
  }

  if (userPoints.size <= 1) return []

  const minPoints = Math.min(...Array.from(userPoints.values()))
  const lastPlaceUsers = Array.from(userPoints.entries())
    .filter(([, pts]) => pts === minPoints)
    .map(([userId]) => userId)

  if (lastPlaceUsers.length > 0) {
    await db.golfPick.updateMany({
      where: { tournamentId, userId: { in: lastPlaceUsers } },
      data: { isUserCut: true },
    })
  }

  return lastPlaceUsers
}

// ─── Tournament Finish Bonuses ────────────────────────────────────────────────

/**
 * After the tournament completes: award finish bonuses to users who picked
 * the top 3 finishers. Bonuses are added on top of the golfer's R4 points.
 *   1st = +20, 2nd = +10, 3rd = +5
 */
export async function calculateTournamentBonuses(tournamentId: string): Promise<void> {
  const BONUSES: Record<number, number> = { 1: 20, 2: 10, 3: 5 }

  // Get R4 round record
  const round4 = await db.golfRound.findUnique({
    where: { tournamentId_roundNumber: { tournamentId, roundNumber: 4 } },
  })
  if (!round4) return

  // Get top 3 finishers from round scores (position 1, 2, 3)
  const topFinishers = await db.golfRoundScore.findMany({
    where: {
      roundId: round4.id,
      position: { in: [1, 2, 3] },
    },
  })

  for (const finisher of topFinishers) {
    const bonus = BONUSES[finisher.position!]
    if (!bonus) continue

    // Find all picks for this golfer in this tournament
    const picks = await db.golfPick.findMany({
      where: { tournamentId, golferId: finisher.golferId },
    })

    for (const pick of picks) {
      await db.golfPickRoundPoints.upsert({
        where: { pickId_roundId: { pickId: pick.id, roundId: round4.id } },
        create: { pickId: pick.id, roundId: round4.id, points: bonus },
        update: { points: { increment: bonus } },
      })
    }
  }
}

// ─── Tournament Archive ───────────────────────────────────────────────────────

/**
 * After scoring and bonuses are finalized: snapshot the leaderboard into
 * GolfTournamentResult for each user. Safe to call multiple times (upsert).
 */
export async function archiveTournamentResults(tournamentId: string): Promise<void> {
  const picks = await db.golfPick.findMany({
    where: { tournamentId },
    include: { roundPoints: true },
  })

  // Sum all points per user
  const userTotals = new Map<string, { points: number; isUserCut: boolean }>()
  for (const pick of picks) {
    const pts = pick.roundPoints.reduce((sum, rp) => sum + rp.points, 0)
    const existing = userTotals.get(pick.userId)
    userTotals.set(pick.userId, {
      points: (existing?.points ?? 0) + pts,
      isUserCut: (existing?.isUserCut ?? false) || pick.isUserCut,
    })
  }

  if (userTotals.size === 0) return

  // Rank users (highest points = rank 1, ties share rank)
  const sorted = Array.from(userTotals.entries()).sort(([, a], [, b]) => b.points - a.points)
  const totalUsers = sorted.length

  const upserts = sorted.map(async ([userId, { points, isUserCut }], index) => {
    // Assign same rank to tied users
    const rank = index === 0
      ? 1
      : sorted[index - 1][1].points === points
        ? (await getRankForPoints(sorted, points))
        : index + 1

    return db.golfTournamentResult.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      create: { userId, tournamentId, totalPoints: points, rank, totalUsers, isUserCut },
      update: { totalPoints: points, rank, totalUsers, isUserCut, archivedAt: new Date() },
    })
  })

  await Promise.all(upserts)
}

function getRankForPoints(
  sorted: [string, { points: number; isUserCut: boolean }][],
  points: number
): number {
  return sorted.findIndex(([, v]) => v.points === points) + 1
}

// ─── Tiebreaker Resolution ────────────────────────────────────────────────────

/**
 * Returns tiebreaker rankings for a tournament once the winning score is known.
 * Closest predicted score without going over wins. Going over = last.
 */
export async function resolveTiebreakers(
  tournamentId: string,
  actualWinningScore: number
): Promise<{ userId: string; predictedScore: number; diff: number; rank: number }[]> {
  const tiebreakers = await db.golfTiebreaker.findMany({ where: { tournamentId } })

  const ranked = tiebreakers
    .map((tb) => ({
      userId: tb.userId,
      predictedScore: tb.predictedScore,
      // Going over actual score = penalized to last
      diff: tb.predictedScore <= actualWinningScore
        ? actualWinningScore - tb.predictedScore
        : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.diff - b.diff)

  return ranked.map((entry, i) => ({ ...entry, rank: i + 1 }))
}

// ─── Full Tournament Scoring Pipeline ────────────────────────────────────────

/**
 * Convenience function: recalculate all points for all completed rounds
 * in a tournament. Useful after syncing new data from ESPN.
 */
export async function recalculateTournament(tournamentId: string): Promise<void> {
  const rounds = await db.golfRound.findMany({
    where: { tournamentId, isCompleted: true },
    orderBy: { roundNumber: 'asc' },
  })

  for (const round of rounds) {
    await calculateRoundPoints(round.id)
    if (round.roundNumber === 2) {
      await processRound2Cuts(tournamentId)
    }
  }

  const tournament = await db.golfTournament.findUnique({ where: { id: tournamentId } })
  if (tournament?.status === 'COMPLETED') {
    await calculateTournamentBonuses(tournamentId)
    await archiveTournamentResults(tournamentId)
  }
}
