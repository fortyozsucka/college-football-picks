import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Auto-progress to next week when current week games are completed
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting automatic week progression check...')
    
    // Get all currently active weeks
    const activeWeeks = await db.week.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { season: 'desc' },
        { week: 'desc' }
      ]
    })

    console.log('📅 Currently active weeks:', activeWeeks)

    if (activeWeeks.length === 0) {
      return NextResponse.json({ 
        message: 'No active weeks found - no progression needed',
        progressed: false 
      })
    }

    let progressionMade = false
    const progressionLog: string[] = []

    // Check each active week to see if all games are completed
    for (const activeWeek of activeWeeks) {
      console.log(`🔍 Checking week ${activeWeek.week} of ${activeWeek.season}...`)
      
      // Get all games for this week
      const weekGames = await db.game.findMany({
        where: {
          week: activeWeek.week,
          season: activeWeek.season
        }
      })

      if (weekGames.length === 0) {
        console.log(`⚠️ No games found for week ${activeWeek.week} ${activeWeek.season}`)
        continue
      }

      // Check if all games are completed
      const completedGames = weekGames.filter(game => game.completed)
      const allGamesCompleted = completedGames.length === weekGames.length

      console.log(`🎮 Week ${activeWeek.week} ${activeWeek.season}: ${completedGames.length}/${weekGames.length} games completed`)

      // Additional check: ensure enough time has passed since the last game
      if (allGamesCompleted) {
        const lastGameDate = new Date(weekGames[weekGames.length - 1].startTime)
        const currentDate = new Date()
        const hoursSinceLastGame = (currentDate.getTime() - lastGameDate.getTime()) / (1000 * 3600)
        
        console.log(`⏰ Last game was ${hoursSinceLastGame.toFixed(1)} hours ago (${lastGameDate.toISOString()})`)
        
        // Configurable buffer time (default 24 hours)
        // Can be adjusted via query parameter: ?buffer=48 for 48 hours
        const { searchParams } = new URL(request.url)
        const bufferHours = parseInt(searchParams.get('buffer') || '24')
        
        // Only progress if:
        // 1. All games are completed AND
        // 2. Sufficient time has passed since the last scheduled game
        // This prevents premature progression during multi-day weeks
        if (hoursSinceLastGame >= bufferHours) {
        // All games in this week are completed, find the next week
        const nextWeek = await findNextAvailableWeek(activeWeek.season, activeWeek.week)
        
        if (nextWeek) {
          console.log(`➡️ Progressing from week ${activeWeek.week} to week ${nextWeek.week} of ${nextWeek.season}`)
          
          // Deactivate current week
          await db.week.update({
            where: { id: activeWeek.id },
            data: { isActive: false }
          })

          // Activate next week (create if doesn't exist)
          await db.week.upsert({
            where: {
              week_season: {
                week: nextWeek.week,
                season: nextWeek.season
              }
            },
            update: { isActive: true },
            create: {
              week: nextWeek.week,
              season: nextWeek.season,
              isActive: true
            }
          })

          progressionMade = true
          progressionLog.push(`Progressed from Week ${activeWeek.week} ${activeWeek.season} to Week ${nextWeek.week} ${nextWeek.season}`)
        } else {
          console.log(`⚠️ No next week found after week ${activeWeek.week} ${activeWeek.season}`)
          progressionLog.push(`Week ${activeWeek.week} ${activeWeek.season} completed but no next week available`)
        }
        } else {
          console.log(`⏳ Week ${activeWeek.week} ${activeWeek.season} completed but only ${hoursSinceLastGame.toFixed(1)} hours since last game (need ${bufferHours}+ hours)`)
          progressionLog.push(`Week ${activeWeek.week} ${activeWeek.season} completed but waiting for ${bufferHours}-hour buffer (${hoursSinceLastGame.toFixed(1)} hours elapsed)`)
        }
      } else {
        console.log(`⏳ Week ${activeWeek.week} ${activeWeek.season} still has ${weekGames.length - completedGames.length} games in progress`)
      }
    }

    return NextResponse.json({
      message: progressionMade ? 'Week progression completed' : 'No progression needed',
      progressed: progressionMade,
      log: progressionLog
    })

  } catch (error) {
    console.error('❌ Error in automatic week progression:', error)
    return NextResponse.json({ 
      error: 'Internal server error during week progression',
      progressed: false 
    }, { status: 500 })
  }
}

// Helper function to find the next available week that has games
async function findNextAvailableWeek(currentSeason: number, currentWeek: number) {
  // Try weeks in the same season first
  for (let week = currentWeek + 1; week <= 17; week++) {
    const hasGames = await db.game.count({
      where: { season: currentSeason, week }
    })
    
    if (hasGames > 0) {
      return { season: currentSeason, week }
    }
  }

  // If no more weeks in current season, try next season starting from week 1
  const nextSeason = currentSeason + 1
  for (let week = 1; week <= 17; week++) {
    const hasGames = await db.game.count({
      where: { season: nextSeason, week }
    })
    
    if (hasGames > 0) {
      return { season: nextSeason, week }
    }
  }

  // No next week found
  return null
}