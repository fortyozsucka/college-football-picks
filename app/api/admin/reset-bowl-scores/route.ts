import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculatePoints, determineBowlTier, GameType, BowlTier } from '@/lib/game-classification'

function getSpreadWinner(homeScore: number, awayScore: number, spread: number, homeTeam: string, awayTeam: string): string {
  const homeScoreWithSpread = homeScore + spread

  if (homeScoreWithSpread > awayScore) {
    return homeTeam
  } else if (homeScoreWithSpread < awayScore) {
    return awayTeam
  } else {
    return 'Push'
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Reset and recalculate bowl/playoff scores',
    usage: 'POST to this endpoint to reset and recalculate all bowl/playoff pick scores',
    description: 'Resets points to null for all bowl/playoff picks, then recalculates with correct tier-based scoring'
  })
}

export async function POST(request: Request) {
  try {
    const { dryRun } = await request.json().catch(() => ({ dryRun: false }))

    console.log(`🏈 ${dryRun ? 'DRY RUN:' : ''} Resetting and recalculating bowl/playoff scores...`)

    // Step 1: Get all bowl/playoff picks (completed games only)
    const bowlPlayoffPicks = await db.pick.findMany({
      where: {
        game: {
          gameType: {
            in: ['BOWL', 'PLAYOFF']
          },
          completed: true,
          homeScore: { not: null },
          awayScore: { not: null }
        }
      },
      include: {
        game: true,
        user: true
      }
    })

    console.log(`Found ${bowlPlayoffPicks.length} completed bowl/playoff picks`)

    // Step 2: Calculate point adjustments needed
    const userPointAdjustments = new Map<string, number>()
    const recalculatedPicks: any[] = []
    let premiumCount = 0
    let standardCount = 0

    for (const pick of bowlPlayoffPicks) {
      const { game } = pick

      // Determine bowl tier
      const bowlTier = determineBowlTier(game.notes || '', '')

      // Calculate spread winner
      const spreadWinner = getSpreadWinner(
        game.homeScore!,
        game.awayScore!,
        pick.lockedSpread,
        game.homeTeam,
        game.awayTeam
      )

      const isPush = spreadWinner === 'Push'
      const isWin = !isPush && spreadWinner === pick.pickedTeam

      // Calculate NEW correct points
      const newPoints = calculatePoints(
        game.gameType as GameType,
        bowlTier as BowlTier,
        isWin,
        isPush,
        pick.isDoubleDown
      )

      const oldPoints = pick.points || 0
      const pointDifference = newPoints - oldPoints

      let result = ""
      if (isPush) {
        result = "push"
      } else if (isWin) {
        result = "win"
      } else {
        result = "loss"
      }

      if (bowlTier === 'PREMIUM') {
        premiumCount++
      } else {
        standardCount++
      }

      // Track user point adjustments
      if (!userPointAdjustments.has(pick.userId)) {
        userPointAdjustments.set(pick.userId, 0)
      }
      userPointAdjustments.set(pick.userId, userPointAdjustments.get(pick.userId)! + pointDifference)

      recalculatedPicks.push({
        user: pick.user.name || pick.user.email,
        game: `${game.awayTeam} @ ${game.homeTeam}`,
        bowlTier,
        pickedTeam: pick.pickedTeam,
        result: isWin ? 'WIN' : isPush ? 'PUSH' : 'LOSS',
        oldPoints,
        newPoints,
        difference: pointDifference
      })

      if (!dryRun) {
        // Update the pick with new points
        await db.pick.update({
          where: { id: pick.id },
          data: {
            points: newPoints,
            result,
            isDoubleDown: true // Ensure this is set
          }
        })
      }
    }

    // Step 3: Update user total scores
    const userUpdates: any[] = []

    if (!dryRun) {
      for (const [userId, adjustment] of Array.from(userPointAdjustments.entries())) {
        if (adjustment !== 0) {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, totalScore: true }
          })

          await db.user.update({
            where: { id: userId },
            data: {
              totalScore: {
                increment: adjustment
              }
            }
          })

          userUpdates.push({
            name: user?.name || user?.email,
            oldScore: user?.totalScore || 0,
            adjustment,
            newScore: (user?.totalScore || 0) + adjustment
          })
        }
      }
    } else {
      // For dry run, just show what would happen
      for (const [userId, adjustment] of Array.from(userPointAdjustments.entries())) {
        if (adjustment !== 0) {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, totalScore: true }
          })

          userUpdates.push({
            name: user?.name || user?.email,
            oldScore: user?.totalScore || 0,
            adjustment,
            newScore: (user?.totalScore || 0) + adjustment
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun ? 'Dry run complete - no changes made' : 'Bowl/playoff scores reset and recalculated successfully',
      summary: {
        totalPicks: bowlPlayoffPicks.length,
        premiumPicks: premiumCount,
        standardPicks: standardCount,
        usersAffected: userPointAdjustments.size
      },
      userUpdates,
      pickDetails: recalculatedPicks.filter(p => p.difference !== 0)
    })

  } catch (error) {
    console.error('Error resetting bowl scores:', error)
    return NextResponse.json(
      { error: 'Failed to reset bowl scores', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
