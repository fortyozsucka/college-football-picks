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
    message: 'Bowl scoring fix endpoint',
    usage: 'POST to this endpoint to fix bowl game scoring',
    description: 'Fixes isDoubleDown flags and recalculates points with tier-based scoring'
  })
}

export async function POST(request: Request) {
  try {
    const { dryRun } = await request.json().catch(() => ({ dryRun: false }))

    const results = {
      step1: { picksFixed: 0, message: '' },
      step2: { picksRecalculated: 0, premiumPicks: 0, standardPicks: 0, message: '' },
      step3: { userScoreChanges: [] as any[], message: '' },
      step4: { missingPickPenalties: 0, message: '' },
      dryRun
    }

    // Step 1: Fix isDoubleDown for special games
    console.log('Step 1: Checking isDoubleDown flags...')

    const picksToFix = await db.pick.findMany({
      where: {
        game: {
          gameType: {
            in: ['CHAMPIONSHIP', 'BOWL', 'PLAYOFF', 'ARMY_NAVY']
          }
        },
        isDoubleDown: false
      },
      include: {
        game: true,
        user: true
      }
    })

    if (picksToFix.length > 0) {
      if (!dryRun) {
        const updateResult = await db.pick.updateMany({
          where: {
            id: {
              in: picksToFix.map(p => p.id)
            }
          },
          data: {
            isDoubleDown: true
          }
        })
        results.step1.picksFixed = updateResult.count
      } else {
        results.step1.picksFixed = picksToFix.length
      }
      results.step1.message = `${results.step1.picksFixed} special game picks ${dryRun ? 'would be' : 'were'} updated to isDoubleDown=true`
    } else {
      results.step1.message = 'All special game picks already have isDoubleDown=true'
    }

    // Step 2: Recalculate bowl and playoff game scores
    console.log('Step 2: Recalculating bowl and playoff game scores...')

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

    const userPointChanges = new Map<string, { name: string, email: string, change: number }>()

    for (const pick of bowlPlayoffPicks) {
      const { game } = pick

      const bowlTier = determineBowlTier(game.notes || '', '')

      const spreadWinner = getSpreadWinner(
        game.homeScore!,
        game.awayScore!,
        pick.lockedSpread,
        game.homeTeam,
        game.awayTeam
      )

      const isPush = spreadWinner === 'Push'
      const isWin = !isPush && spreadWinner === pick.pickedTeam

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
        results.step2.premiumPicks++
      } else {
        results.step2.standardPicks++
      }

      if (!userPointChanges.has(pick.userId)) {
        userPointChanges.set(pick.userId, {
          name: pick.user.name || pick.user.email,
          email: pick.user.email,
          change: 0
        })
      }
      userPointChanges.get(pick.userId)!.change += pointDifference

      if (!dryRun) {
        await db.pick.update({
          where: { id: pick.id },
          data: {
            points: newPoints,
            result,
            isDoubleDown: true
          }
        })
      }
    }

    results.step2.picksRecalculated = bowlPlayoffPicks.length
    results.step2.message = `${results.step2.picksRecalculated} bowl/playoff picks ${dryRun ? 'would be' : 'were'} recalculated (${results.step2.premiumPicks} Premium, ${results.step2.standardPicks} Standard)`

    // Step 3: Update user total scores
    console.log('Step 3: Updating user total scores...')

    for (const [userId, userData] of Array.from(userPointChanges.entries())) {
      if (userData.change !== 0) {
        results.step3.userScoreChanges.push({
          name: userData.name,
          email: userData.email,
          change: userData.change
        })

        if (!dryRun) {
          await db.user.update({
            where: { id: userId },
            data: {
              totalScore: {
                increment: userData.change
              }
            }
          })
        }
      }
    }

    results.step3.message = `${results.step3.userScoreChanges.length} user scores ${dryRun ? 'would be' : 'were'} updated`

    // Step 4: Handle missing picks penalty for premium bowl/playoff games
    console.log('Step 4: Checking for missing pick penalties on premium games...')

    const premiumGames = await db.game.findMany({
      where: {
        completed: true,
        gameType: {
          in: ['BOWL', 'PLAYOFF']
        }
      },
      include: {
        picks: {
          select: {
            userId: true
          }
        }
      }
    })

    const allUsers = await db.user.findMany({
      select: { id: true, name: true, email: true }
    })

    let missingPickPenalties = 0

    for (const game of premiumGames) {
      const bowlTier = determineBowlTier(game.notes || '', '')
      if (bowlTier !== 'PREMIUM') continue

      for (const user of allUsers) {
        const existingPick = game.picks.find(p => p.userId === user.id)

        if (!existingPick) {
          if (!dryRun) {
            await db.pick.create({
              data: {
                userId: user.id,
                gameId: game.id,
                pickedTeam: 'NO_PICK',
                lockedSpread: game.spread,
                isDoubleDown: false,
                points: -1,
                result: 'no_pick'
              }
            })

            await db.user.update({
              where: { id: user.id },
              data: {
                totalScore: {
                  decrement: 1
                }
              }
            })
          }

          missingPickPenalties++
        }
      }
    }

    results.step4.missingPickPenalties = missingPickPenalties
    results.step4.message = `${missingPickPenalties} missing pick penalties ${dryRun ? 'would be' : 'were'} applied`

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun ? 'Dry run complete - no changes were made' : 'Bowl scoring fix complete',
      results
    })

  } catch (error) {
    console.error('Error fixing bowl scoring:', error)
    return NextResponse.json(
      { error: 'Failed to fix bowl scoring', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
