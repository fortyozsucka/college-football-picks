const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🏈 Bowl Games Status Report\n')

  // Get all bowl and playoff games
  const bowlGames = await prisma.game.findMany({
    where: {
      gameType: {
        in: ['BOWL', 'PLAYOFF', 'CHAMPIONSHIP', 'ARMY_NAVY']
      }
    },
    orderBy: [
      { week: 'asc' },
      { startTime: 'asc' }
    ],
    include: {
      picks: {
        select: {
          id: true,
          userId: true,
          pickedTeam: true,
          isDoubleDown: true,
          points: true,
          result: true
        }
      }
    }
  })

  if (bowlGames.length === 0) {
    console.log('⚠️  No bowl, playoff, championship, or Army-Navy games found in database')
    console.log('\nTo sync postseason games, run:')
    console.log('   node scripts/sync-postseason.js 2024')
    console.log('\nOr use the admin panel "Sync Postseason" button')
    return
  }

  console.log(`Found ${bowlGames.length} special games\n`)

  const stats = {
    BOWL: { total: 0, completed: 0, upcoming: 0, picks: 0 },
    PLAYOFF: { total: 0, completed: 0, upcoming: 0, picks: 0 },
    CHAMPIONSHIP: { total: 0, completed: 0, upcoming: 0, picks: 0 },
    ARMY_NAVY: { total: 0, completed: 0, upcoming: 0, picks: 0 }
  }

  console.log('=' .repeat(80))
  console.log('GAMES BY TYPE:')
  console.log('=' .repeat(80))

  for (const gameType of ['CHAMPIONSHIP', 'ARMY_NAVY', 'BOWL', 'PLAYOFF']) {
    const games = bowlGames.filter(g => g.gameType === gameType)
    if (games.length === 0) continue

    console.log(`\n${gameType} Games (${games.length} total):`)
    console.log('-'.repeat(80))

    for (const game of games) {
      const status = game.completed ? '✅ COMPLETE' : '📅 UPCOMING'
      const pickCount = game.picks.length
      const scoredCount = game.picks.filter(p => p.points !== null).length

      stats[gameType].total++
      if (game.completed) {
        stats[gameType].completed++
      } else {
        stats[gameType].upcoming++
      }
      stats[gameType].picks += pickCount

      console.log(`\n${status} Week ${game.week}: ${game.awayTeam} @ ${game.homeTeam}`)
      console.log(`   Start: ${new Date(game.startTime).toLocaleString()}`)
      console.log(`   Spread: ${game.spread > 0 ? '+' : ''}${game.spread} (${game.favoredTeam})`)
      if (game.notes) {
        console.log(`   Notes: ${game.notes}`)
      }
      console.log(`   Picks: ${pickCount} total, ${scoredCount} scored`)

      if (game.completed) {
        console.log(`   Score: ${game.homeTeam} ${game.homeScore}, ${game.awayTeam} ${game.awayScore}`)

        // Show pick results summary
        const wins = game.picks.filter(p => p.result === 'win').length
        const losses = game.picks.filter(p => p.result === 'loss').length
        const pushes = game.picks.filter(p => p.result === 'push').length
        const unscored = game.picks.filter(p => p.points === null).length

        if (pickCount > 0) {
          console.log(`   Results: ${wins} wins, ${losses} losses, ${pushes} pushes${unscored > 0 ? `, ${unscored} unscored` : ''}`)
        }
      } else if (pickCount > 0) {
        // Show which teams people picked
        const homeTeamPicks = game.picks.filter(p => p.pickedTeam === game.homeTeam).length
        const awayTeamPicks = game.picks.filter(p => p.pickedTeam === game.awayTeam).length
        console.log(`   Pick split: ${game.homeTeam} (${homeTeamPicks}), ${game.awayTeam} (${awayTeamPicks})`)
      }
    }
  }

  console.log('\n' + '=' .repeat(80))
  console.log('SUMMARY:')
  console.log('=' .repeat(80))

  for (const [type, data] of Object.entries(stats)) {
    if (data.total === 0) continue
    console.log(`\n${type}:`)
    console.log(`   Total games: ${data.total}`)
    console.log(`   Completed: ${data.completed}`)
    console.log(`   Upcoming: ${data.upcoming}`)
    console.log(`   Total picks: ${data.picks}`)
  }

  // Check for any issues
  console.log('\n' + '=' .repeat(80))
  console.log('ISSUES CHECK:')
  console.log('=' .repeat(80))

  const completedWithUnscored = bowlGames.filter(g =>
    g.completed && g.picks.some(p => p.points === null)
  )

  if (completedWithUnscored.length > 0) {
    console.log(`\n⚠️  ${completedWithUnscored.length} completed games have unscored picks:`)
    for (const game of completedWithUnscored) {
      const unscoredCount = game.picks.filter(p => p.points === null).length
      console.log(`   - ${game.awayTeam} @ ${game.homeTeam}: ${unscoredCount} unscored picks`)
    }
    console.log('\n   Fix: Run POST /api/picks/calculate-points')
  } else {
    console.log('\n✅ No issues found - all completed games are scored')
  }

  const picksWithWrongDoubleDown = bowlGames.flatMap(g =>
    g.picks.filter(p => !p.isDoubleDown)
  )

  if (picksWithWrongDoubleDown.length > 0) {
    console.log(`\n⚠️  ${picksWithWrongDoubleDown.length} special game picks have isDoubleDown=false`)
    console.log('   Fix: Run node scripts/fix-bowl-scoring.js --apply')
  } else {
    console.log('✅ All special game picks have correct isDoubleDown flag')
  }

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
