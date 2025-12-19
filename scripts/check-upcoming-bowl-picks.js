const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Bowl tier determination logic
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

  if (combined.includes('national championship') ||
      combined.includes('semifinal') ||
      combined.includes('semi-final') ||
      combined.includes('playoff')) {
    return 'PREMIUM'
  }

  if (NY6_BOWLS.some(bowl => combined.includes(bowl))) {
    return 'PREMIUM'
  }

  return 'STANDARD'
}

async function main() {
  console.log('🏈 Upcoming Bowl Game Picks Report\n')

  // Get all picks for upcoming bowl/playoff games
  const upcomingPicks = await prisma.pick.findMany({
    where: {
      game: {
        gameType: {
          in: ['BOWL', 'PLAYOFF']
        },
        completed: false
      }
    },
    include: {
      game: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      game: {
        startTime: 'asc'
      }
    }
  })

  if (upcomingPicks.length === 0) {
    console.log('⚠️  No picks found for upcoming bowl/playoff games\n')
    return
  }

  console.log(`Found ${upcomingPicks.length} picks for upcoming bowl/playoff games\n`)
  console.log('=' .repeat(80))

  const issues = []
  const picksByGame = new Map()

  for (const pick of upcomingPicks) {
    const { game } = pick

    if (!picksByGame.has(game.id)) {
      picksByGame.set(game.id, {
        game,
        picks: []
      })
    }
    picksByGame.get(game.id).picks.push(pick)

    const bowlTier = determineBowlTier(game.notes || '', '')
    const shouldBeDoubleDown = game.gameType === 'BOWL' || game.gameType === 'PLAYOFF'

    // Check for issues
    if (shouldBeDoubleDown && !pick.isDoubleDown) {
      issues.push({
        type: 'MISSING_DOUBLE_DOWN',
        pick,
        game,
        user: pick.user
      })
    }
  }

  // Display picks grouped by game
  for (const [gameId, data] of picksByGame.entries()) {
    const { game, picks } = data
    const bowlTier = determineBowlTier(game.notes || '', '')
    const scoringInfo = bowlTier === 'PREMIUM'
      ? '+2 win / -1 loss or push'
      : '+1 win / 0 loss or push'

    console.log(`\n📅 ${game.awayTeam} @ ${game.homeTeam}`)
    console.log(`   Type: ${game.gameType} (${bowlTier})`)
    console.log(`   Starts: ${new Date(game.startTime).toLocaleString()}`)
    console.log(`   Spread: ${game.spread > 0 ? '+' : ''}${game.spread}`)
    console.log(`   Scoring: ${scoringInfo}`)
    if (game.notes) {
      console.log(`   Notes: ${game.notes}`)
    }
    console.log(`\n   Picks (${picks.length}):`)

    for (const pick of picks) {
      const ddStatus = pick.isDoubleDown ? '✅ DD' : '⚠️  NO DD'
      console.log(`      ${ddStatus} - ${pick.user.name}: ${pick.pickedTeam} (spread: ${pick.lockedSpread})`)
    }
  }

  console.log('\n' + '=' .repeat(80))

  // Report issues
  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:\n')

    const missingDD = issues.filter(i => i.type === 'MISSING_DOUBLE_DOWN')

    if (missingDD.length > 0) {
      console.log(`   ${missingDD.length} bowl/playoff picks missing isDoubleDown flag:`)
      for (const issue of missingDD) {
        console.log(`      - ${issue.user.name}: ${issue.game.awayTeam} @ ${issue.game.homeTeam}`)
      }
      console.log('\n   Fix: Run node scripts/fix-bowl-scoring.js --apply')
    }
  } else {
    console.log('\n✅ All picks are properly configured!')
    console.log('   - All bowl/playoff picks have isDoubleDown=true')
    console.log('   - Ready for scoring when games complete')
  }

  // Additional stats
  console.log('\n📊 Pick Statistics:')
  const uniqueUsers = new Set(upcomingPicks.map(p => p.userId))
  const premiumPicks = upcomingPicks.filter(p => {
    const tier = determineBowlTier(p.game.notes || '', '')
    return tier === 'PREMIUM'
  })
  const standardPicks = upcomingPicks.filter(p => {
    const tier = determineBowlTier(p.game.notes || '', '')
    return tier === 'STANDARD'
  })

  console.log(`   Total picks: ${upcomingPicks.length}`)
  console.log(`   Unique users: ${uniqueUsers.size}`)
  console.log(`   Premium bowl/playoff picks: ${premiumPicks.length}`)
  console.log(`   Standard bowl picks: ${standardPicks.length}`)
  console.log()
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
