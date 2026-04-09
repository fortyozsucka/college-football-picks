import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    console.log('Fixing missing scores...')

    // Fix Wisconsin vs Miami (OH) game - Final score was 17-0
    const wisconsinGame = await db.game.updateMany({
      where: {
        homeTeam: 'Wisconsin',
        awayTeam: 'Miami (OH)',
        homeScore: 17,
        awayScore: null
      },
      data: {
        awayScore: 0 // Miami (OH) scored 0 points
      }
    })

    console.log(`Updated ${wisconsinGame.count} games with missing scores`)

    // Also check for any other games with missing scores
    const gamesWithMissingScores = await db.game.findMany({
      where: {
        completed: true,
        OR: [
          { homeScore: null },
          { awayScore: null }
        ]
      },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true
      }
    })

    return NextResponse.json({
      message: 'Scores fixed successfully',
      wisconsinGameUpdated: wisconsinGame.count,
      remainingGamesWithMissingScores: gamesWithMissingScores
    })

  } catch (error) {
    console.error('Error fixing scores:', error)
    return NextResponse.json(
      { error: 'Failed to fix scores' },
      { status: 500 }
    )
  }
}