import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Admin endpoint to analyze and clean up historical data
export async function GET(request: NextRequest) {
  try {
    // Get all unique season/week combinations in games
    const gameSeasons = await db.game.findMany({
      select: {
        season: true,
        week: true
      },
      distinct: ['season', 'week'],
      orderBy: [
        { season: 'desc' },
        { week: 'asc' }
      ]
    })

    // Get all Week records
    const weekRecords = await db.week.findMany({
      orderBy: [
        { season: 'desc' },
        { week: 'asc' }
      ]
    })

    // Count games by season
    const gameCountsBySeason = await db.game.groupBy({
      by: ['season'],
      _count: {
        id: true
      },
      orderBy: {
        season: 'desc'
      }
    })

    // Get all users
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        totalScore: true,
        isAdmin: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({
      gameSeasons,
      weekRecords,
      gameCountsBySeason,
      users,
      summary: {
        totalSeasons: gameCountsBySeason.length,
        totalWeekRecords: weekRecords.length,
        totalGameCombinations: gameSeasons.length,
        totalUsers: users.length
      }
    })

  } catch (error) {
    console.error('Error analyzing data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Clean up historical data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentSeason = parseInt(searchParams.get('keepSeason') || '2025')
    const cleanupUsers = searchParams.get('cleanupUsers') === 'true'
    
    console.log(`🧹 Cleaning up data - keeping season ${currentSeason} and newer`)

    let deletedUsersCount = 0
    
    if (cleanupUsers) {
      // Delete test users (users with test-like emails or names)
      const deletedUsers = await db.user.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { email: { contains: 'test' } },
                { email: { contains: 'example' } },
                { name: { contains: 'Test' } },
                { name: { contains: 'test' } },
                { email: { endsWith: '@test.com' } },
                { email: { endsWith: '@example.com' } }
              ]
            },
            {
              isAdmin: false // Don't delete admin users even if they contain "test"
            }
          ]
        }
      })
      deletedUsersCount = deletedUsers.count
      console.log(`🧹 Deleted ${deletedUsersCount} test users`)
    }

    // Delete all games from seasons before current season
    const deletedGames = await db.game.deleteMany({
      where: {
        season: {
          lt: currentSeason
        }
      }
    })

    // Delete all week records from seasons before current season
    const deletedWeeks = await db.week.deleteMany({
      where: {
        season: {
          lt: currentSeason
        }
      }
    })

    // Note: Picks will be automatically deleted due to CASCADE relationship

    return NextResponse.json({
      message: `Cleaned up historical data before season ${currentSeason}${cleanupUsers ? ' and removed test users' : ''}`,
      deletedGames: deletedGames.count,
      deletedWeeks: deletedWeeks.count,
      deletedUsers: deletedUsersCount
    })

  } catch (error) {
    console.error('Error cleaning up data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}