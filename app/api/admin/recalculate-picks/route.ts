import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Check current state
    const totalPicks = await db.pick.count()
    const scoredPicks = await db.pick.count({
      where: { points: { not: null } }
    })

    // Show some examples of potentially incorrect picks
    const samplePicks = await db.pick.findMany({
      where: {
        points: { not: null },
        game: { completed: true }
      },
      include: {
        game: {
          select: {
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            spread: true
          }
        }
      },
      take: 5
    })

    return NextResponse.json({
      totalPicks,
      scoredPicks,
      unscoredPicks: totalPicks - scoredPicks,
      samplePicks: samplePicks.map(pick => ({
        id: pick.id,
        pickedTeam: pick.pickedTeam,
        lockedSpread: pick.lockedSpread,
        currentGameSpread: pick.game.spread,
        spreadsDifferent: pick.lockedSpread !== pick.game.spread,
        points: pick.points,
        game: pick.game
      }))
    })
  } catch (error) {
    console.error('Error checking picks:', error)
    return NextResponse.json({ error: 'Failed to check picks' }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔄 Starting picks recalculation...')

    // Step 1: Reset all pick points to null
    const resetResult = await db.pick.updateMany({
      where: { points: { not: null } },
      data: { points: null, result: null }
    })

    console.log(`✅ Reset ${resetResult.count} pick scores`)

    // Step 2: Reset all user total scores to 0
    const userResetResult = await db.user.updateMany({
      data: { totalScore: 0 }
    })

    console.log(`✅ Reset ${userResetResult.count} user total scores`)

    return NextResponse.json({
      message: 'All picks reset successfully. Run /api/picks/calculate-points to recalculate.',
      picksReset: resetResult.count,
      usersReset: userResetResult.count,
      nextStep: 'POST /api/picks/calculate-points'
    })

  } catch (error) {
    console.error('Error resetting picks:', error)
    return NextResponse.json({ error: 'Failed to reset picks' }, { status: 500 })
  }
}