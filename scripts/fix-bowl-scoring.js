const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Bowl tier determination logic (matching lib/game-classification.ts)
const NY6_BOWLS = [
  'rose bowl',
  'sugar bowl',
  'orange bowl',
  'cotton bowl',
  'fiesta bowl',
  'peach bowl'
]

function determineBowlTier(notes = '', gameName = '') {
  const notesLower = notes.toLowerCase()
  const gameNameLower = gameName.toLowerCase()
  const combined = `${notesLower} ${gameNameLower}`

  // Check for playoff games (National Championship, Semifinals)
  if (combined.includes('national championship') ||
      combined.includes('semifinal') ||
      combined.includes('semi-final') ||
      combined.includes('playoff')) {
    return 'PREMIUM'
  }

  // Check for NY6 bowls
  if (NY6_BOWLS.some(bowl => combined.includes(bowl))) {
    return 'PREMIUM'
  }

  // All other bowls are standard
  return 'STANDARD'
}

// Calculate points based on game type and bowl tier (matching lib/game-classification.ts)
function calculatePoints(gameType, bowlTier, isWin, isPush, isDoubleDown) {
  // Handle bowl and playoff games with tier-based scoring
  if (gameType === 'BOWL' || gameType === 'PLAYOFF') {
    if (bowlTier === 'PREMIUM') {
      // Premium bowls/playoffs: 2 pts win, -1 loss/push
      if (isWin && !isPush) return 2
      return -1
    } else {
      // Standard bowls: 1 pt win, 0 loss/push
      if (isWin && !isPush) return 1
      return 0
    }
  }

  // Regular season and championship games use standard double-down logic
  if (isPush) {
    return isDoubleDown ? -1 : 0
  }

  if (isWin) {
    return isDoubleDown ? 2 : 1
  } else {
    return isDoubleDown ? -1 : 0
  }
}

function getSpreadWinner(homeScore, awayScore, spread, homeTeam, awayTeam) {
  const homeScoreWithSpread = homeScore + spread

  if (homeScoreWithSpread > awayScore) {
    return homeTeam
  } else if (homeScoreWithSpread < awayScore) {
    return awayTeam
  } else {
    return 'Push'
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d')

  console.log('🏈 Bowl Game Scoring Fix Script\n')
  console.log('This script will:')
  console.log('  1. Fix isDoubleDown flag for all bowl/playoff/championship/Army-Navy picks')
  console.log('  2. Recalculate points for all bowl/playoff game picks using tier-based scoring')
  console.log('  3. Update user total scores\n')

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  // Step 1: Fix isDoubleDown for special games
  console.log('Step 1: Checking isDoubleDown flags...\n')

  const picksToFix = await prisma.pick.findMany({
    where: {
      game: {
        gameType: {
          in: ['CHAMPIONSHIP', 'BOWL', 'PLAYOFF', 'ARMY_NAVY']
        }
      },
      isDoubleDown: false
    },
    include: {
      game: {
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          gameType: true,
          week: true,
          season: true,
          completed: true,
          notes: true
        }
      },
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  })

  if (picksToFix.length > 0) {
    console.log(`⚠️  Found ${picksToFix.length} special game picks with isDoubleDown=false:\n`)

    const byType = {}
    for (const pick of picksToFix) {
      const type = pick.game.gameType
      if (!byType[type]) byType[type] = []
      byType[type].push(pick)
    }

    for (const [type, picks] of Object.entries(byType)) {
      console.log(`   ${type}: ${picks.length} picks`)
    }
    console.log()

    if (!isDryRun) {
      const updateResult = await prisma.pick.updateMany({
        where: {
          id: {
            in: picksToFix.map(p => p.id)
          }
        },
        data: {
          isDoubleDown: true
        }
      })
      console.log(`✅ Updated ${updateResult.count} picks to have isDoubleDown=true\n`)
    }
  } else {
    console.log('✅ All special game picks already have isDoubleDown=true\n')
  }

  // Step 2: Recalculate bowl and playoff game scores
  console.log('Step 2: Recalculating bowl and playoff game scores...\n')

  // Get all bowl and playoff picks
  const bowlPlayoffPicks = await prisma.pick.findMany({
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

  console.log(`Found ${bowlPlayoffPicks.length} completed bowl/playoff picks to recalculate\n`)

  const bowlStats = {
    premium: { count: 0, wins: 0, losses: 0, pushes: 0, points: 0 },
    standard: { count: 0, wins: 0, losses: 0, pushes: 0, points: 0 }
  }

  const userPointChanges = new Map()

  for (const pick of bowlPlayoffPicks) {
    const { game } = pick

    // Determine bowl tier
    const bowlTier = determineBowlTier(game.notes || '', '')

    // Calculate spread winner
    const spreadWinner = getSpreadWinner(
      game.homeScore,
      game.awayScore,
      pick.lockedSpread,
      game.homeTeam,
      game.awayTeam
    )

    const isPush = spreadWinner === 'Push'
    const isWin = !isPush && spreadWinner === pick.pickedTeam

    // Calculate new points using tier-based system
    const newPoints = calculatePoints(
      game.gameType,
      bowlTier,
      isWin,
      isPush,
      pick.isDoubleDown
    )

    const oldPoints = pick.points || 0
    const pointDifference = newPoints - oldPoints

    let result = ""
    if (isPush) {
      result = "push"
      bowlStats[bowlTier.toLowerCase()].pushes++
    } else if (isWin) {
      result = "win"
      bowlStats[bowlTier.toLowerCase()].wins++
    } else {
      result = "loss"
      bowlStats[bowlTier.toLowerCase()].losses++
    }

    bowlStats[bowlTier.toLowerCase()].count++
    bowlStats[bowlTier.toLowerCase()].points += newPoints

    // Track user point changes
    if (!userPointChanges.has(pick.userId)) {
      userPointChanges.set(pick.userId, {
        name: pick.user.name,
        email: pick.user.email,
        change: 0
      })
    }
    userPointChanges.get(pick.userId).change += pointDifference

    if (!isDryRun) {
      // Update the pick
      await prisma.pick.update({
        where: { id: pick.id },
        data: {
          points: newPoints,
          result,
          isDoubleDown: true // Ensure this is set
        }
      })
    }

    if (pointDifference !== 0 || isDryRun) {
      console.log(`   ${pick.user.name}: ${game.awayTeam} @ ${game.homeTeam} (${bowlTier})`)
      console.log(`      Picked: ${pick.pickedTeam}, Winner: ${spreadWinner}`)
      console.log(`      ${isDryRun ? 'Would change' : 'Changed'}: ${oldPoints} → ${newPoints} pts (${pointDifference >= 0 ? '+' : ''}${pointDifference})`)
    }
  }

  console.log('\n📊 Bowl/Playoff Scoring Summary:')
  console.log(`   PREMIUM (NY6 + Playoffs): ${bowlStats.premium.count} picks`)
  console.log(`      Wins: ${bowlStats.premium.wins} (+2 pts each)`)
  console.log(`      Losses/Pushes: ${bowlStats.premium.losses + bowlStats.premium.pushes} (-1 pt each)`)
  console.log(`      Total points: ${bowlStats.premium.points}`)
  console.log()
  console.log(`   STANDARD (Other Bowls): ${bowlStats.standard.count} picks`)
  console.log(`      Wins: ${bowlStats.standard.wins} (+1 pt each)`)
  console.log(`      Losses/Pushes: ${bowlStats.standard.losses + bowlStats.standard.pushes} (0 pts)`)
  console.log(`      Total points: ${bowlStats.standard.points}`)
  console.log()

  // Step 3: Update user total scores
  if (userPointChanges.size > 0) {
    console.log('Step 3: Updating user total scores...\n')

    for (const [userId, userData] of userPointChanges.entries()) {
      if (userData.change !== 0) {
        console.log(`   ${userData.name}: ${userData.change >= 0 ? '+' : ''}${userData.change} pts`)

        if (!isDryRun) {
          await prisma.user.update({
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
  } else {
    console.log('Step 3: No user score changes needed\n')
  }

  // Step 4: Handle missing picks penalty for premium bowl/playoff games
  console.log('\nStep 4: Checking for missing pick penalties on premium games...\n')

  const premiumGames = await prisma.game.findMany({
    where: {
      completed: true,
      gameType: {
        in: ['BOWL', 'PLAYOFF']
      }
    },
    include: {
      picks: {
        select: {
          userId: true,
          result: true
        }
      }
    }
  })

  let missingPickPenalties = 0
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  })

  for (const game of premiumGames) {
    const bowlTier = determineBowlTier(game.notes || '', '')
    if (bowlTier !== 'PREMIUM') continue

    // Check each user for missing picks
    for (const user of allUsers) {
      const existingPick = game.picks.find(p => p.userId === user.id)

      if (!existingPick) {
        console.log(`   ❌ ${user.name} missing pick for: ${game.awayTeam} @ ${game.homeTeam}`)

        if (!isDryRun) {
          await prisma.pick.create({
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

          await prisma.user.update({
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

  if (missingPickPenalties > 0) {
    console.log(`\n   ${isDryRun ? 'Would apply' : 'Applied'} ${missingPickPenalties} missing pick penalties (-1 pt each)`)
  } else {
    console.log('   ✅ No missing pick penalties needed')
  }

  console.log('\n' + '='.repeat(60))
  if (isDryRun) {
    console.log('\n✅ DRY RUN COMPLETE - No changes were made')
    console.log('\nTo apply these changes, run:')
    console.log('   node scripts/fix-bowl-scoring.js --apply\n')
  } else {
    console.log('\n✅ BOWL SCORING FIX COMPLETE!')
    console.log('\nAll bowl and playoff game scores have been recalculated with correct tier-based scoring.\n')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
