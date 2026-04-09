import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const BONUS_MAP: Record<number, number> = { 1: 20, 2: 10, 3: 5 }

// GET /api/golf/leaderboard?tournamentId=
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

    if (tournament.status === 'UPCOMING') {
      return NextResponse.json({ tournament, leaderboard: [] })
    }

    // Work out who earned finish bonuses so we can separate them from R4
    // Bonuses: 1st=20, 2nd=10, 3rd=5 — awarded to users who picked that golfer
    const bonusByUser = new Map<string, number>()

    const round4 = tournament.rounds.find((r) => r.roundNumber === 4)
    if (round4) {
      const topFinishers = await db.golfRoundScore.findMany({
        where: { roundId: round4.id, position: { in: [1, 2, 3] } },
      })

      for (const finisher of topFinishers) {
        const bonus = BONUS_MAP[finisher.position!]
        if (!bonus) continue
        const picksForGolfer = await db.golfPick.findMany({
          where: { tournamentId, golferId: finisher.golferId },
        })
        for (const pick of picksForGolfer) {
          bonusByUser.set(pick.userId, (bonusByUser.get(pick.userId) ?? 0) + bonus)
        }
      }
    }

    // Load tiebreakers for this tournament
    const tiebreakers = await db.golfTiebreaker.findMany({ where: { tournamentId } })
    const tiebreakerByUser = new Map(tiebreakers.map((tb) => [tb.userId, tb.predictedScore]))

    // Resolve tiebreaker ranks based on winning score (if known)
    const tiebreakerRankByUser = new Map<string, number>()
    if (tournament.winningScore !== null && tournament.winningScore !== undefined) {
      const ranked = tiebreakers
        .map((tb) => ({
          userId: tb.userId,
          diff: tb.predictedScore <= tournament.winningScore!
            ? tournament.winningScore! - tb.predictedScore
            : Number.MAX_SAFE_INTEGER,
        }))
        .sort((a, b) => a.diff - b.diff)
      ranked.forEach((entry, i) => tiebreakerRankByUser.set(entry.userId, i + 1))
    }

    // Fast path for completed tournaments — use archived results
    if (tournament.status === 'COMPLETED') {
      const archived = await db.golfTournamentResult.findMany({
        where: { tournamentId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { rank: 'asc' },
      })

      // Also get round totals for completed tournaments
      const picks = await db.golfPick.findMany({
        where: { tournamentId },
        include: {
          roundPoints: { include: { round: true } },
        },
      })

      const roundTotalsByUser = new Map<string, Record<number, number>>()
      for (const pick of picks) {
        if (!roundTotalsByUser.has(pick.userId)) roundTotalsByUser.set(pick.userId, {})
        const rt = roundTotalsByUser.get(pick.userId)!
        for (const rp of pick.roundPoints) {
          rt[rp.round.roundNumber] = (rt[rp.round.roundNumber] ?? 0) + rp.points
        }
      }

      return NextResponse.json({
        tournament,
        leaderboard: archived.map((r) => {
          const rt = roundTotalsByUser.get(r.userId) ?? {}
          const bonus = bonusByUser.get(r.userId) ?? 0
          const r4Raw = rt[4] ?? 0
          return {
            userId: r.userId,
            name: r.user.name ?? r.user.email.split('@')[0],
            email: r.user.email,
            totalPoints: r.totalPoints,
            rank: r.rank,
            isUserCut: r.isUserCut,
            roundTotals: { ...rt, 4: r4Raw - bonus },
            bonusPoints: bonus,
            tiebreakerScore: tiebreakerByUser.get(r.userId) ?? null,
            tiebreakerRank: tiebreakerRankByUser.get(r.userId) ?? null,
          }
        }),
      })
    }

    // Live / in-progress
    const picks = await db.golfPick.findMany({
      where: { tournamentId },
      include: {
        golfer: true,
        user: { select: { id: true, name: true, email: true } },
        roundPoints: {
          include: { round: true },
          orderBy: { round: { roundNumber: 'asc' } },
        },
      },
    })

    const userMap = new Map<string, {
      userId: string
      name: string
      email: string
      totalPoints: number
      isUserCut: boolean
      roundTotals: Record<number, number>
      golfers: { fullName: string; group: string; points: number[] }[]
    }>()

    for (const pick of picks) {
      const userId = pick.userId
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          name: pick.user.name ?? pick.user.email.split('@')[0],
          email: pick.user.email,
          totalPoints: 0,
          isUserCut: false,
          roundTotals: {},
          golfers: [],
        })
      }

      const entry = userMap.get(userId)!
      const pickTotal = pick.roundPoints.reduce((sum, rp) => sum + rp.points, 0)
      entry.totalPoints += pickTotal
      if (pick.isUserCut) entry.isUserCut = true

      pick.roundPoints.forEach((rp) => {
        entry.roundTotals[rp.round.roundNumber] =
          (entry.roundTotals[rp.round.roundNumber] ?? 0) + rp.points
      })

      entry.golfers.push({
        fullName: pick.golfer.fullName,
        group: pick.golferGroup,
        points: pick.roundPoints.map((rp) => rp.points),
      })
    }

    const sorted = Array.from(userMap.values()).sort((a, b) => b.totalPoints - a.totalPoints)
    const leaderboard = sorted.map((entry, i) => {
      const bonus = bonusByUser.get(entry.userId) ?? 0
      const r4Raw = entry.roundTotals[4] ?? 0
      return {
        ...entry,
        roundTotals: { ...entry.roundTotals, 4: r4Raw - bonus },
        bonusPoints: bonus,
        tiebreakerScore: tiebreakerByUser.get(entry.userId) ?? null,
        tiebreakerRank: tiebreakerRankByUser.get(entry.userId) ?? null,
        rank:
          i === 0 || sorted[i - 1].totalPoints !== entry.totalPoints
            ? i + 1
            : sorted.findIndex((e) => e.totalPoints === entry.totalPoints) + 1,
      }
    })

    return NextResponse.json({ tournament, leaderboard })
  } catch (error) {
    console.error('Error fetching golf leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
