import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailService, GameResult } from '@/lib/email'

function getSpreadWinner(homeScore: number, awayScore: number, spread: number, homeTeam: string, awayTeam: string): string {
  const scoreDiff = homeScore - awayScore
  const adjustedHomeDiff = scoreDiff + spread
  
  if (adjustedHomeDiff > 0) {
    return homeTeam
  } else if (adjustedHomeDiff < 0) {
    return awayTeam
  } else {
    return 'Push' // Exact tie against the spread
  }
}

export async function POST() {
  try {
    // Get all completed games with picks that haven't been scored yet
    const picks = await db.pick.findMany({
      where: {
        points: null, // Only unscored picks
        game: {
          completed: true,
          homeScore: { not: null },
          awayScore: { not: null }
        }
      },
      include: {
        game: true,
        user: true
      }
    })

    console.log(`Processing ${picks.length} picks for point calculation`)

    let updatedPicks = 0
    let totalPointsAwarded = 0
    
    // Group picks by user for email notifications
    const userPicksMap = new Map()
    const completedGames: GameResult[] = []

    for (const pick of picks) {
      const { game } = pick
      
      if (game.homeScore === null || game.awayScore === null) {
        continue
      }

      // Determine who won against the spread
      const spreadWinner = getSpreadWinner(
        game.homeScore, 
        game.awayScore, 
        game.spread, 
        game.homeTeam, 
        game.awayTeam
      )

      let points = 0

      if (spreadWinner === 'Push') {
        // Push (tie against spread) = treated as a loss
        points = pick.isDoubleDown ? -1 : 0
      } else if (spreadWinner === pick.pickedTeam) {
        // User picked correctly
        points = pick.isDoubleDown ? 2 : 1
      } else {
        // User picked incorrectly
        points = pick.isDoubleDown ? -1 : 0
      }

      // Update the pick with calculated points
      await db.pick.update({
        where: { id: pick.id },
        data: { points }
      })

      // Update user's total score
      await db.user.update({
        where: { id: pick.userId },
        data: {
          totalScore: {
            increment: points
          }
        }
      })

      updatedPicks++
      totalPointsAwarded += points

      // Store pick result for email notifications
      if (!userPicksMap.has(pick.userId)) {
        userPicksMap.set(pick.userId, {
          user: pick.user,
          picks: []
        })
      }
      userPicksMap.get(pick.userId).picks.push({
        ...pick,
        points,
        spreadWinner
      })

      // Add to completed games list (avoid duplicates)
      if (!completedGames.find(g => g.homeTeam === game.homeTeam && g.awayTeam === game.awayTeam)) {
        completedGames.push({
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          spread: game.spread,
          winner: spreadWinner === 'Push' ? 'Push' : spreadWinner,
          startTime: game.startTime
        })
      }

      console.log(`Pick ${pick.id}: ${pick.user.name} picked ${pick.pickedTeam} (${pick.isDoubleDown ? 'DOUBLE DOWN' : 'NORMAL'}) - Spread winner: ${spreadWinner} - Points: ${points}`)
    }

    // Send email notifications to users about their results
    if (userPicksMap.size > 0) {
      console.log(`Sending game result emails to ${userPicksMap.size} users`)
      
      for (const [userId, userData] of Array.from(userPicksMap.entries())) {
        try {
          const email = emailService.generateGameResultsEmail(
            userData.user.email,
            userData.picks,
            completedGames
          )
          
          // Only send emails in production with valid API key
          if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_key_for_development') {
            await emailService.sendEmail(email)
          } else {
            console.log(`Would send email to ${userData.user.email}: ${email.subject}`)
          }
        } catch (error) {
          console.error(`Failed to send email to ${userData.user.email}:`, error)
        }
      }
    }

    return NextResponse.json({
      message: 'Points calculated successfully',
      updatedPicks,
      totalPointsAwarded,
      emailsSent: userPicksMap.size
    })

  } catch (error) {
    console.error('Error calculating points:', error)
    return NextResponse.json(
      { error: 'Failed to calculate points' },
      { status: 500 }
    )
  }
}