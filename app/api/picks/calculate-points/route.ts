import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailService, GameResult } from '@/lib/email'
import { cfbApi } from '@/lib/cfb-api'
import { calculatePoints, determineBowlTier, GameType } from '@/lib/game-classification'

function getSpreadWinner(homeScore: number, awayScore: number, spread: number, homeTeam: string, awayTeam: string): string {
  // Spread is stored from home team's perspective
  // Positive spread means away team is favored by that amount
  // Negative spread means home team is favored by that amount
  
  const homeScoreWithSpread = homeScore + spread
  
  if (homeScoreWithSpread > awayScore) {
    return homeTeam
  } else if (homeScoreWithSpread < awayScore) {
    return awayTeam
  } else {
    return 'Push' // Exact tie against the spread
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Points calculation endpoint',
    usage: 'POST to this endpoint to calculate points for unscored picks',
    description: 'Fetches live scores from CFB API and calculates points for all unscored picks based on spread results'
  })
}

export async function POST() {
  try {
    // Get all picks that haven't been scored yet
    const picks = await db.pick.findMany({
      where: {
        points: null, // Only unscored picks
      },
      include: {
        game: true,
        user: true
      }
    })

    console.log(`Found ${picks.length} unscored picks, checking scores via CFB API`)

    // Get unique weeks/seasons from the picks
    const weekSeasonPairs = new Set<string>()
    picks.forEach(pick => {
      const key = `${pick.game.season}-${pick.game.week}`
      weekSeasonPairs.add(key)
    })

    // Fetch live scores for all relevant weeks
    const liveScoresByGameId = new Map<string, any>()
    for (const weekSeason of Array.from(weekSeasonPairs)) {
      const [season, week] = weekSeason.split('-').map(Number)
      try {
        const scoreboardData = await cfbApi.getScoreboard(season, week)
        for (const game of scoreboardData) {
          if (game.status === 'completed' && game.homeTeam?.points !== null && game.awayTeam?.points !== null) {
            liveScoresByGameId.set(game.id.toString(), {
              homeScore: game.homeTeam.points,
              awayScore: game.awayTeam.points,
              homeTeam: game.homeTeam.name,
              awayTeam: game.awayTeam.name
            })
          }
        }
      } catch (error) {
        console.error(`Failed to fetch scores for ${season} week ${week}:`, error)
      }
    }

    console.log(`Fetched live scores for ${liveScoresByGameId.size} completed games`)

    let updatedPicks = 0
    let totalPointsAwarded = 0
    
    // Group picks by user for email notifications
    const userPicksMap = new Map()
    const completedGames: GameResult[] = []

    for (const pick of picks) {
      const { game } = pick
      
      // Check if we have live scores for this game
      const liveScore = liveScoresByGameId.get(game.cfbId)
      if (!liveScore) {
        console.log(`No live scores available for game ${game.homeTeam} vs ${game.awayTeam}`)
        continue
      }

      const homeScore = liveScore.homeScore
      const awayScore = liveScore.awayScore

      // Determine who won against the spread using live scores and LOCKED spread
      const spreadWinner = getSpreadWinner(
        homeScore,
        awayScore,
        pick.lockedSpread, // Use the locked spread from when pick was made
        game.homeTeam,
        game.awayTeam
      )

      let points = 0
      let result = ""

      const isPush = spreadWinner === 'Push'
      const isWin = !isPush && spreadWinner === pick.pickedTeam

      // Determine bowl tier for playoff/bowl games
      const bowlTier = (game.gameType === 'BOWL' || game.gameType === 'PLAYOFF')
        ? determineBowlTier(game.notes || '', '')
        : undefined

      // Calculate points using the new tier-based system
      points = calculatePoints(
        game.gameType as GameType,
        bowlTier,
        isWin,
        isPush,
        pick.isDoubleDown
      )

      if (isPush) {
        result = "push"
      } else if (isWin) {
        result = "win"
      } else {
        result = "loss"
      }

      // Update the pick with calculated points and result
      await db.pick.update({
        where: { id: pick.id },
        data: { points, result }
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
          homeScore: homeScore,
          awayScore: awayScore,
          spread: pick.lockedSpread,
          winner: spreadWinner === 'Push' ? 'Push' : spreadWinner,
          startTime: game.startTime
        })
      }

      console.log(`Pick ${pick.id}: ${pick.user.name} picked ${pick.pickedTeam} (${pick.isDoubleDown ? 'DOUBLE DOWN' : 'NORMAL'}) - Locked spread: ${pick.lockedSpread} - Spread winner: ${spreadWinner} - Points: ${points}`)
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

    // Handle missing picks penalty for premium bowl/playoff games
    // Get all completed premium bowl/playoff games that need penalties
    const completedPremiumGames = await db.game.findMany({
      where: {
        completed: true,
        gameType: {
          in: ['BOWL', 'PLAYOFF']
        }
      }
    })

    let missingPickPenalties = 0
    for (const game of completedPremiumGames) {
      // Check if this is a premium tier game
      const bowlTier = determineBowlTier(game.notes || '', '')
      if (bowlTier !== 'PREMIUM') continue // Only penalize for premium games

      // Get all users
      const allUsers = await db.user.findMany({
        select: { id: true }
      })

      // Check each user for missing picks
      for (const user of allUsers) {
        const existingPick = await db.pick.findUnique({
          where: {
            userId_gameId: {
              userId: user.id,
              gameId: game.id
            }
          }
        })

        // If no pick exists, create a penalty pick
        if (!existingPick) {
          await db.pick.create({
            data: {
              userId: user.id,
              gameId: game.id,
              pickedTeam: 'NO_PICK',
              lockedSpread: game.spread,
              isDoubleDown: false,
              points: -1,
              result: 'no_pick'
            }
          })

          // Update user's total score
          await db.user.update({
            where: { id: user.id },
            data: {
              totalScore: {
                decrement: 1
              }
            }
          })

          missingPickPenalties++
          console.log(`❌ No pick penalty: User ${user.id} did not pick premium game ${game.homeTeam} vs ${game.awayTeam} (-1 pt)`)
        }
      }
    }

    return NextResponse.json({
      message: 'Points calculated successfully',
      updatedPicks,
      totalPointsAwarded,
      emailsSent: userPicksMap.size,
      missingPickPenalties
    })

  } catch (error) {
    console.error('Error calculating points:', error)
    return NextResponse.json(
      { error: 'Failed to calculate points' },
      { status: 500 }
    )
  }
}