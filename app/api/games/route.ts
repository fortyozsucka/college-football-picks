import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get active weeks
    const activeWeeks = await db.week.findMany({
      where: {
        isActive: true
      },
      select: {
        week: true,
        season: true
      }
    })

    // If no weeks are active, return empty array
    if (activeWeeks.length === 0) {
      return NextResponse.json([])
    }

    // Create OR conditions for active weeks
    const weekConditions = activeWeeks.map(({ week, season }) => ({
      AND: [
        { week },
        { season }
      ]
    }))

    const games = await db.game.findMany({
      where: {
        OR: weekConditions
      },
      include: {
        picks: true
      },
      orderBy: [
        { season: 'desc' },
        { week: 'desc' },
        { completed: 'asc' },
        { startTime: 'asc' }
      ]
    })

    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const gameData = await request.json()
    
    const game = await db.game.create({
      data: {
        cfbId: gameData.cfbId,
        week: gameData.week,
        season: gameData.season,
        homeTeam: gameData.homeTeam,
        awayTeam: gameData.awayTeam,
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        spread: gameData.spread || 0,
        overUnder: gameData.overUnder,
        startTime: new Date(gameData.startTime),
        completed: gameData.completed || false,
        winner: gameData.winner
      }
    })

    return NextResponse.json(game)
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
}