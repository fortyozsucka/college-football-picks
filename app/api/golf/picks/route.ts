import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/golf/picks?userId=&tournamentId=
// Before tournament starts: only returns the requesting user's own picks.
// Once IN_PROGRESS or COMPLETED: all picks are visible.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const tournamentId = searchParams.get('tournamentId')

    // Check tournament status to enforce pick visibility rules
    if (tournamentId) {
      const tournament = await db.golfTournament.findUnique({
        where: { id: tournamentId },
        select: { status: true },
      })

      if (tournament?.status === 'UPCOMING') {
        // Before tournament starts — only allow a user to see their own picks
        const currentUser = await getCurrentUser()
        const requestedUserId = userId ?? currentUser?.id

        if (!currentUser || (requestedUserId && requestedUserId !== currentUser.id && !currentUser.isAdmin)) {
          // Return empty array rather than 403 so the UI renders cleanly
          return NextResponse.json([])
        }

        // Only return the current user's picks
        const picks = await db.golfPick.findMany({
          where: { userId: currentUser.id, tournamentId },
          include: {
            golfer: true,
            tournament: true,
            roundPoints: { include: { round: true }, orderBy: { round: { roundNumber: 'asc' } } },
          },
          orderBy: [{ golferGroup: 'asc' }, { createdAt: 'asc' }],
        })
        return NextResponse.json(picks)
      }
    }

    // Tournament started or no tournament filter — return all matching picks
    const picks = await db.golfPick.findMany({
      where: {
        ...(userId && { userId }),
        ...(tournamentId && { tournamentId }),
      },
      include: {
        golfer: true,
        tournament: true,
        user: { select: { id: true, name: true, email: true } },
        roundPoints: {
          include: { round: true },
          orderBy: { round: { roundNumber: 'asc' } },
        },
      },
      orderBy: [{ golferGroup: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(picks)
  } catch (error) {
    console.error('Error fetching golf picks:', error)
    return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
  }
}

// POST /api/golf/picks — submit all 6 picks for a tournament
// Body: { userId, tournamentId, golfers: [{ golferId, group }], tiebreakerScore }
export async function POST(request: Request) {
  try {
    const { userId, tournamentId, golfers, tiebreakerScore } = await request.json()

    if (!userId || !tournamentId || !golfers) {
      return NextResponse.json({ error: 'userId, tournamentId, and golfers are required' }, { status: 400 })
    }

    if (tiebreakerScore === undefined || tiebreakerScore === null || tiebreakerScore === '') {
      return NextResponse.json({ error: 'Tiebreaker score is required' }, { status: 400 })
    }

    if (!Array.isArray(golfers) || golfers.length !== 6) {
      return NextResponse.json({ error: 'Must pick exactly 6 golfers' }, { status: 400 })
    }

    // Validate 2 from each group
    const groupCounts = golfers.reduce((acc: Record<string, number>, g: any) => {
      acc[g.group] = (acc[g.group] ?? 0) + 1
      return acc
    }, {})

    if (groupCounts.A !== 2 || groupCounts.B !== 2 || groupCounts.C !== 2) {
      return NextResponse.json({ error: 'Must pick exactly 2 golfers from each group (A, B, C)' }, { status: 400 })
    }

    // Validate no duplicate golfers
    const golferIds = golfers.map((g: any) => g.golferId)
    if (new Set(golferIds).size !== golferIds.length) {
      return NextResponse.json({ error: 'Cannot pick the same golfer twice' }, { status: 400 })
    }

    // Validate tournament exists and hasn't started
    const tournament = await db.golfTournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }
    if (tournament.status !== 'UPCOMING') {
      return NextResponse.json({ error: 'Tournament has already started — picks are locked' }, { status: 400 })
    }

    // Validate user is enrolled in golf
    const user = await db.user.findUnique({ where: { id: userId }, select: { playGolf: true } })
    if (!user?.playGolf) {
      return NextResponse.json({ error: 'User is not enrolled in the golf league' }, { status: 403 })
    }

    // Check for existing picks (replace if re-submitting before tournament starts)
    const existingPicks = await db.golfPick.findMany({ where: { userId, tournamentId } })
    if (existingPicks.length > 0) {
      await db.golfPick.deleteMany({ where: { userId, tournamentId } })
    }

    // Create all 6 picks
    const picks = await db.golfPick.createMany({
      data: golfers.map((g: any) => ({
        userId,
        tournamentId,
        golferId: g.golferId,
        golferGroup: g.group,
      })),
    })

    // Upsert tiebreaker if provided
    if (tiebreakerScore !== undefined && tiebreakerScore !== null) {
      await db.golfTiebreaker.upsert({
        where: { userId_tournamentId: { userId, tournamentId } },
        create: { userId, tournamentId, predictedScore: parseInt(tiebreakerScore) },
        update: { predictedScore: parseInt(tiebreakerScore) },
      })
    }

    return NextResponse.json({ success: true, count: picks.count }, { status: 201 })
  } catch (error) {
    console.error('Error submitting golf picks:', error)
    return NextResponse.json({ error: 'Failed to submit picks' }, { status: 500 })
  }
}

// DELETE /api/golf/picks?userId=&tournamentId= — only allowed before tournament starts
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const tournamentId = searchParams.get('tournamentId')

    if (!userId || !tournamentId) {
      return NextResponse.json({ error: 'userId and tournamentId are required' }, { status: 400 })
    }

    const tournament = await db.golfTournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }
    if (tournament.status !== 'UPCOMING') {
      return NextResponse.json({ error: 'Cannot delete picks after tournament has started' }, { status: 400 })
    }

    await db.golfPick.deleteMany({ where: { userId, tournamentId } })
    await db.golfTiebreaker.deleteMany({ where: { userId, tournamentId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting golf picks:', error)
    return NextResponse.json({ error: 'Failed to delete picks' }, { status: 500 })
  }
}
