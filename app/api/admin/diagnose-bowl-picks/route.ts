import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { determineBowlTier, calculatePoints, GameType, BowlTier } from '@/lib/game-classification'

function getSpreadWinner(homeScore: number, awayScore: number, spread: number, homeTeam: string, awayTeam: string): string {
  const homeScoreWithSpread = homeScore + spread

  if (homeScoreWithSpread > awayScore) {
    return homeTeam
  } else if (homeScoreWithSpread < awayScore) {
    return awayTeam
  } else {
    return 'Push'
  }
}

export async function GET() {
  try {
    // Get all completed bowl/playoff picks
    const bowlPicks = await db.pick.findMany({
      where: {
        game: {
          gameType: {
            in: ['BOWL', 'PLAYOFF']
          },
          completed: true,
          homeScore: { not: null },
          awayScore: { not: null }
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
          startTime: 'desc'
        }
      }
    })

    const diagnostics: any[] = []
    let issuesFound = 0

    for (const pick of bowlPicks) {
      const { game } = pick

      // Determine bowl tier
      const bowlTier = determineBowlTier(game.notes || '', '')

      // Calculate spread winner
      const spreadWinner = getSpreadWinner(
        game.homeScore!,
        game.awayScore!,
        pick.lockedSpread,
        game.homeTeam,
        game.awayTeam
      )

      const isPush = spreadWinner === 'Push'
      const isWin = !isPush && spreadWinner === pick.pickedTeam

      // Calculate what points SHOULD be
      const correctPoints = calculatePoints(
        game.gameType as GameType,
        bowlTier as BowlTier,
        isWin,
        isPush,
        pick.isDoubleDown
      )

      const currentPoints = pick.points || 0
      const isCorrect = currentPoints === correctPoints

      if (!isCorrect) {
        issuesFound++
      }

      diagnostics.push({
        user: pick.user.name || pick.user.email,
        game: `${game.awayTeam} @ ${game.homeTeam}`,
        gameType: game.gameType,
        bowlTier,
        startTime: game.startTime,
        pickedTeam: pick.pickedTeam,
        lockedSpread: pick.lockedSpread,
        finalScore: `${game.awayTeam} ${game.awayScore}, ${game.homeTeam} ${game.homeScore}`,
        spreadWinner,
        result: isWin ? 'WIN' : isPush ? 'PUSH' : 'LOSS',
        isDoubleDown: pick.isDoubleDown,
        currentPoints,
        correctPoints,
        isCorrect,
        difference: correctPoints - currentPoints,
        notes: game.notes
      })
    }

    // Summary by tier
    const summary = {
      totalPicks: bowlPicks.length,
      issuesFound,
      byTier: {
        PREMIUM: {
          total: diagnostics.filter(d => d.bowlTier === 'PREMIUM').length,
          incorrect: diagnostics.filter(d => d.bowlTier === 'PREMIUM' && !d.isCorrect).length
        },
        STANDARD: {
          total: diagnostics.filter(d => d.bowlTier === 'STANDARD').length,
          incorrect: diagnostics.filter(d => d.bowlTier === 'STANDARD' && !d.isCorrect).length
        }
      }
    }

    return NextResponse.json({
      summary,
      incorrectPicks: diagnostics.filter(d => !d.isCorrect),
      allPicks: diagnostics
    })

  } catch (error) {
    console.error('Error diagnosing bowl picks:', error)
    return NextResponse.json(
      { error: 'Failed to diagnose bowl picks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
