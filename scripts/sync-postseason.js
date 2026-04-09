#!/usr/bin/env node
/**
 * Sync postseason games (bowl games, playoffs, Army-Navy) for a given season
 * Usage: node scripts/sync-postseason.js [season]
 * Example: node scripts/sync-postseason.js 2024
 */

const fetch = require('node-fetch')

async function syncPostseason(season) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  console.log(`🏈 Syncing postseason games for ${season} season...`)
  console.log(`Base URL: ${baseUrl}`)

  try {
    // Sync postseason games - we use week 16 as a placeholder, but postseason=true will fetch ALL postseason games
    const syncUrl = `${baseUrl}/api/games/sync?season=${season}&week=16&postseason=true`
    console.log(`Calling: ${syncUrl}`)

    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResponse.statusText}`)
    }

    const syncResult = await syncResponse.json()
    console.log('✅ Sync result:', syncResult)
    console.log(`   - Games created: ${syncResult.gamesCreated}`)
    console.log(`   - Games updated: ${syncResult.gamesUpdated}`)
    console.log(`   - Total games: ${syncResult.totalGames}`)

    return syncResult
  } catch (error) {
    console.error('❌ Error syncing postseason games:', error.message)
    throw error
  }
}

// Main execution - use same season logic as the app
function getCurrentSeason() {
  const now = new Date()
  const year = now.getFullYear()
  // College football season runs from August to January of next year
  // Month is 0-indexed, so 7 = August
  return now.getMonth() >= 7 ? year : year - 1
}

const season = process.argv[2] || getCurrentSeason()
console.log(`Starting postseason sync for ${season}...`)
console.log(`(Current date: ${new Date().toLocaleDateString()})`)

syncPostseason(parseInt(season))
  .then(() => {
    console.log('\n🎉 Postseason games synced successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Check the admin panel to see which weeks have games')
    console.log('   2. Activate the appropriate weeks for bowl games')
    console.log('   3. Users can now make their bowl picks!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed to sync postseason games:', error)
    process.exit(1)
  })
