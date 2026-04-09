const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Check if this is a dry run
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d')

  console.log('🔍 Checking for championship/special game picks that need fixing...\n')

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  // Find all picks for special games (Championship, Bowl, Playoff, Army-Navy) that don't have isDoubleDown=true
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
          homeTeam: true,
          awayTeam: true,
          gameType: true,
          week: true,
          season: true,
          completed: true
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

  if (picksToFix.length === 0) {
    console.log('✅ No picks need fixing! All special game picks already have isDoubleDown=true')
    return
  }

  console.log(`⚠️  Found ${picksToFix.length} special game pick(s) that need to be updated:\n`)

  // Group by game type for better visibility
  const byType = {}
  for (const pick of picksToFix) {
    const type = pick.game.gameType
    if (!byType[type]) byType[type] = []
    byType[type].push(pick)
  }

  for (const [type, picks] of Object.entries(byType)) {
    console.log(`\n📋 ${type} Games (${picks.length} picks):`)
    for (const pick of picks) {
      console.log(`   • ${pick.user.name || pick.user.email}: ${pick.pickedTeam}`)
      console.log(`     ${pick.game.awayTeam} @ ${pick.game.homeTeam} (Week ${pick.game.week}, ${pick.game.season})`)
      console.log(`     Completed: ${pick.game.completed ? 'Yes ⚠️' : 'No'}`)
    }
  }

  if (isDryRun) {
    console.log('\n\n💡 This was a dry run. To apply these changes, run:')
    console.log('   node scripts/fix-championship-picks.js --apply\n')
    return
  }

  if (!process.argv.includes('--apply')) {
    console.log('\n\n⚠️  To apply these changes, run:')
    console.log('   node scripts/fix-championship-picks.js --apply\n')
    console.log('   Or run in dry-run mode first:')
    console.log('   node scripts/fix-championship-picks.js --dry-run\n')
    return
  }

  console.log('\n🔧 Updating picks to have isDoubleDown=true...\n')

  const result = await prisma.pick.updateMany({
    where: {
      id: {
        in: picksToFix.map(p => p.id)
      }
    },
    data: {
      isDoubleDown: true
    }
  })

  console.log(`✅ Updated ${result.count} pick(s)`)
  console.log('\n📊 Summary:')
  console.log(`   - These picks will now score correctly:`)
  console.log(`     • Win: +2 points (was +1)`)
  console.log(`     • Loss/Push: -1 point (was 0)`)

  // Check if any were already completed - those might need points recalculated
  const completedPicks = picksToFix.filter(p => p.game.completed)
  if (completedPicks.length > 0) {
    console.log(`\n⚠️  WARNING: ${completedPicks.length} pick(s) were for completed games!`)
    console.log(`   You may need to recalculate points for these users.`)
    console.log(`   Run: POST /api/picks/calculate-points`)
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
