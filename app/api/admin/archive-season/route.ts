import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { season } = await request.json()

    if (!season || typeof season !== 'number') {
      return NextResponse.json(
        { error: 'Season parameter is required and must be a number' },
        { status: 400 }
      )
    }

    // Check if this season is already archived
    const existingArchive = await db.historicalStats.findFirst({
      where: { season }
    })

    if (existingArchive) {
      return NextResponse.json(
        { error: `Season ${season} is already archived` },
        { status: 400 }
      )
    }

    // Get all users with their season stats
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        totalScore: true,
      }
    })

    // Get all picks for the season to calculate detailed stats
    const allPicks = await db.pick.findMany({
      where: {
        game: {
          season: season
        }
      },
      include: {
        game: {
          select: {
            season: true,
            completed: true
          }
        }
      }
    })

    // Calculate stats for each user
    const userStatsMap = new Map()
    
    for (const user of users) {
      const userPicks = allPicks.filter(pick => pick.userId === user.id)
      const completedPicks = userPicks.filter(pick => pick.game.completed && pick.points !== null)
      const correctPicks = completedPicks.filter(pick => pick.points! > 0)
      const doubleDowns = userPicks.filter(pick => pick.isDoubleDown)
      const correctDoubleDowns = doubleDowns.filter(pick => pick.points !== null && pick.points > 0)

      userStatsMap.set(user.id, {
        userId: user.id,
        userName: user.name || 'Unknown User',
        userEmail: user.email,
        finalScore: user.totalScore,
        totalPicks: userPicks.length,
        correctPicks: correctPicks.length,
        winPercentage: completedPicks.length > 0 ? (correctPicks.length / completedPicks.length) * 100 : 0,
        doubleDowns: doubleDowns.length,
        correctDoubleDowns: correctDoubleDowns.length
      })
    }

    // Sort users by score to assign ranks
    const sortedUsers = Array.from(userStatsMap.values()).sort((a, b) => b.finalScore - a.finalScore)
    const totalUsers = sortedUsers.length

    // Assign ranks (handle ties)
    let currentRank = 1
    for (let i = 0; i < sortedUsers.length; i++) {
      if (i > 0 && sortedUsers[i].finalScore !== sortedUsers[i - 1].finalScore) {
        currentRank = i + 1
      }
      sortedUsers[i].rank = currentRank
      sortedUsers[i].totalUsers = totalUsers
      sortedUsers[i].season = season
    }

    // Save historical stats to database
    const historicalStats = await db.historicalStats.createMany({
      data: sortedUsers.map(stats => ({
        season: stats.season,
        userId: stats.userId,
        userName: stats.userName,
        userEmail: stats.userEmail,
        finalScore: stats.finalScore,
        totalPicks: stats.totalPicks,
        correctPicks: stats.correctPicks,
        winPercentage: Math.round(stats.winPercentage * 100) / 100,
        doubleDowns: stats.doubleDowns,
        correctDoubleDowns: stats.correctDoubleDowns,
        rank: stats.rank,
        totalUsers: stats.totalUsers
      }))
    })

    return NextResponse.json({
      message: `Successfully archived ${historicalStats.count} user records for season ${season}`,
      season,
      usersArchived: historicalStats.count,
      champion: sortedUsers[0]?.userName || 'No users found'
    })

  } catch (error) {
    console.error('Error archiving season:', error)
    return NextResponse.json(
      { error: 'Failed to archive season stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get available seasons that could be archived
    const seasons = await db.game.findMany({
      select: { season: true },
      distinct: ['season'],
      orderBy: { season: 'desc' }
    })

    // Get already archived seasons
    const archivedSeasons = await db.historicalStats.findMany({
      select: { season: true },
      distinct: ['season'],
      orderBy: { season: 'desc' }
    })

    const availableSeasons = seasons
      .filter(s => !archivedSeasons.find(as => as.season === s.season))
      .map(s => s.season)

    return NextResponse.json({
      availableSeasons,
      archivedSeasons: archivedSeasons.map(s => s.season)
    })
  } catch (error) {
    console.error('Error fetching season info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch season information' },
      { status: 500 }
    )
  }
}