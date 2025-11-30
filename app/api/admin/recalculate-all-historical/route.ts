import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getSpreadWinner(homeScore: number, awayScore: number, spread: number, homeTeam: string, awayTeam: string): string {
  // Match frontend logic: scoreDiff + spread
  const scoreDiff = homeScore - awayScore
  const adjustedHomeDiff = scoreDiff + spread

  if (adjustedHomeDiff > 0) {
    return homeTeam
  } else if (adjustedHomeDiff < 0) {
    return awayTeam
  } else {
    return 'Push'
  }
}

export async function POST() {
  try {
    console.log('🔄 Starting complete historical recalculation...')

    // Get ALL picks with null points, including their games
    const picks = await db.pick.findMany({
      where: {
        points: null
      },
      include: {
        game: true,
        user: true
      }
    })

    console.log(`Found ${picks.length} unscored picks across all seasons`)

    let updatedPicks = 0
    let skippedPicks = 0
    let totalPointsAwarded = 0

    for (const pick of picks) {
      const { game } = pick

      // Check if game has final scores
      if (!game.completed || game.homeScore === null || game.awayScore === null) {
        console.log(`Skipping incomplete game: ${game.homeTeam} vs ${game.awayTeam}`)
        skippedPicks++
        continue
      }

      // Use the locked spread from when the pick was made
      const spreadWinner = getSpreadWinner(
        game.homeScore,
        game.awayScore,
        pick.lockedSpread, // Using locked spread!
        game.homeTeam,
        game.awayTeam
      )

      let points = 0
      let result = ""

      if (spreadWinner === 'Push') {
        points = pick.isDoubleDown ? -1 : 0
        result = "push"
      } else if (spreadWinner === pick.pickedTeam) {
        points = pick.isDoubleDown ? 2 : 1
        result = "win"
      } else {
        points = pick.isDoubleDown ? -1 : 0
        result = "loss"
      }

      // Update the pick with calculated points and result
      await db.pick.update({
        where: { id: pick.id },
        data: { points, result }
      })

      // Update user's total score
      await db.user.update({
        where: { id: pick.userId },
        data: {
          totalScore: {
            increment: points
          }
        }
      })

      updatedPicks++
      totalPointsAwarded += points

      console.log(`✅ Pick ${pick.id}: ${pick.user.name} picked ${pick.pickedTeam} (${pick.isDoubleDown ? 'DOUBLE DOWN' : 'NORMAL'}) - Locked spread: ${pick.lockedSpread} - Winner: ${spreadWinner} - Points: ${points}`)
    }

    console.log(`🎉 Recalculation complete!`)
    console.log(`   Updated picks: ${updatedPicks}`)
    console.log(`   Skipped picks: ${skippedPicks}`)
    console.log(`   Total points awarded: ${totalPointsAwarded}`)

    return NextResponse.json({
      message: 'Complete historical recalculation finished',
      updatedPicks,
      skippedPicks,
      totalPointsAwarded,
      totalPicks: picks.length
    })

  } catch (error) {
    console.error('Error in historical recalculation:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate historical picks' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Show status of what would be recalculated
    const unscoredPicks = await db.pick.count({
      where: { points: null }
    })

    const completedGames = await db.game.count({
      where: {
        completed: true,
        homeScore: { not: null },
        awayScore: { not: null }
      }
    })

    const picksWithCompletedGames = await db.pick.count({
      where: {
        points: null,
        game: {
          completed: true,
          homeScore: { not: null },
          awayScore: { not: null }
        }
      }
    })

    return NextResponse.json({
      unscoredPicks,
      completedGames,
      picksWithCompletedGames,
      message: `${picksWithCompletedGames} picks are ready to be scored from completed games`
    })

  } catch (error) {
    console.error('Error checking historical status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}