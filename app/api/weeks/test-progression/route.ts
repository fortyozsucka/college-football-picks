import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Test endpoint to simulate completed games for progression testing
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'complete'
    
    if (action === 'complete') {
      // Mark all games in currently active weeks as completed
      const activeWeeks = await db.week.findMany({
        where: { isActive: true }
      })

      if (activeWeeks.length === 0) {
        return NextResponse.json({ error: 'No active weeks found' }, { status: 400 })
      }

      let totalUpdated = 0
      
      for (const week of activeWeeks) {
        const result = await db.game.updateMany({
          where: {
            week: week.week,
            season: week.season,
            completed: false
          },
          data: {
            completed: true,
            homeScore: 21, // Dummy scores
            awayScore: 14,
            winner: 'homeTeam' // Will be updated by actual game results
          }
        })
        totalUpdated += result.count
      }

      return NextResponse.json({
        message: `Marked ${totalUpdated} games as completed in active weeks`,
        activeWeeks: activeWeeks.map(w => `Week ${w.week} ${w.season}`)
      })
      
    } else if (action === 'reset') {
      // Mark all games as incomplete for testing
      const result = await db.game.updateMany({
        where: { completed: true },
        data: {
          completed: false,
          homeScore: null,
          awayScore: null,
          winner: null
        }
      })

      return NextResponse.json({
        message: `Reset ${result.count} games to incomplete status`
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=complete or ?action=reset' }, { status: 400 })

  } catch (error) {
    console.error('Error in test progression endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}