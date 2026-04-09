import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/golf/scorecard?tournamentId=&userId= (userId optional — returns all users if omitted)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')
    const userId = searchParams.get('userId')

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

    const picks = await db.golfPick.findMany({
      where: {
        tournamentId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        golfer: true,
        roundPoints: {
          include: { round: true },
        },
      },
      orderBy: [{ userId: 'asc' }, { golferGroup: 'asc' }],
    })

    // Get round scores for all golfers
    const roundIds = tournament.rounds.map((r) => r.id)
    const golferIds = picks.map((p) => p.golferId)

    const roundScores = await db.golfRoundScore.findMany({
      where: {
        roundId: { in: roundIds },
        golferId: { in: golferIds },
      },
    })

    // Build scorecard per user
    const userMap = new Map<string, any>()

    for (const pick of picks) {
      if (!userMap.has(pick.userId)) {
        userMap.set(pick.userId, {
          userId: pick.userId,
          name: pick.user.name || pick.user.email,
          isUserCut: false,
          totalPoints: 0,
          golfers: [],
        })
      }

      const entry = userMap.get(pick.userId)
      if (pick.isUserCut) entry.isUserCut = true

      // Build per-round breakdown for this golfer
      const rounds = tournament.rounds.map((round) => {
        const score = roundScores.find(
          (rs) => rs.roundId === round.id && rs.golferId === pick.golferId
        )
        const pointsRecord = pick.roundPoints.find((rp) => rp.roundId === round.id)

        return {
          roundNumber: round.roundNumber,
          roundStatus: round.status,
          score: score?.score ?? null,
          position: score?.position ?? null,
          missedCut: score?.missedCut ?? false,
          withdrawn: score?.withdrawn ?? false,
          points: pointsRecord?.points ?? null,
        }
      })

      const golferTotal = rounds.reduce((sum, r) => sum + (r.points ?? 0), 0)
      entry.totalPoints += golferTotal

      entry.golfers.push({
        golferId: pick.golferId,
        fullName: pick.golfer.fullName,
        group: pick.golferGroup,
        isUserCut: pick.isUserCut,
        rounds,
        total: golferTotal,
      })
    }

    const scorecards = Array.from(userMap.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints
    )

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        season: tournament.season,
        rounds: tournament.rounds,
      },
      scorecards,
    })
  } catch (error) {
    console.error('Error fetching scorecard:', error)
    return NextResponse.json({ error: 'Failed to fetch scorecard' }, { status: 500 })
  }
}
