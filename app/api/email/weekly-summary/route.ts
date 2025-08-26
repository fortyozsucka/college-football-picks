import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailService, WeeklySummary } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Get the active week
    const activeWeek = await db.week.findFirst({
      where: { isActive: true }
    })

    if (!activeWeek) {
      return NextResponse.json({ error: 'No active week found' }, { status: 404 })
    }

    // Get all users with picks for this week
    const users = await db.user.findMany({
      include: {
        picks: {
          where: {
            game: {
              week: activeWeek.week,
              season: activeWeek.season
            }
          },
          include: {
            game: true
          }
        }
      }
    })

    // Get completed games for this week
    const completedGames = await db.game.findMany({
      where: {
        week: activeWeek.week,
        season: activeWeek.season,
        completed: true,
        homeScore: { not: null },
        awayScore: { not: null }
      }
    })

    let emailsSent = 0
    const userSummaries: WeeklySummary[] = []

    // Calculate summaries for each user
    for (const user of users) {
      const userPicks = user.picks
      const correctPicks = userPicks.filter(pick => pick.points && pick.points > 0).length
      const totalPoints = userPicks.reduce((sum, pick) => sum + (pick.points || 0), 0)

      const summary: WeeklySummary = {
        week: activeWeek.week,
        season: activeWeek.season,
        userPicks: userPicks.length,
        correctPicks,
        points: totalPoints,
        rank: 1, // We'll calculate this below
        totalUsers: users.length,
        completedGames: completedGames.map(game => ({
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeScore: game.homeScore!,
          awayScore: game.awayScore!,
          spread: game.spread,
          winner: game.winner || 'Unknown',
          startTime: game.startTime
        }))
      }

      userSummaries.push({
        ...summary,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      })
    }

    // Sort users by points and calculate rankings
    userSummaries.sort((a, b) => b.points - a.points)
    userSummaries.forEach((summary, index) => {
      summary.rank = index + 1
    })

    // Send weekly summary emails
    for (const summary of userSummaries) {
      try {
        const email = emailService.generateWeeklySummaryEmail(
          summary.user.email,
          summary
        )

        // Only send emails in production with valid API key
        if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_key_for_development') {
          await emailService.sendEmail(email)
          console.log(`Weekly summary sent to ${summary.user.email}`)
          emailsSent++
        } else {
          console.log(`Would send weekly summary to ${summary.user.email}: ${email.subject}`)
          emailsSent++
        }
      } catch (error) {
        console.error(`Failed to send weekly summary to ${summary.user.email}:`, error)
      }
    }

    return NextResponse.json({
      message: 'Weekly summary emails sent',
      week: activeWeek.week,
      season: activeWeek.season,
      emailsSent,
      totalUsers: users.length,
      completedGames: completedGames.length
    })

  } catch (error) {
    console.error('Error sending weekly summaries:', error)
    return NextResponse.json(
      { error: 'Failed to send weekly summaries' },
      { status: 500 }
    )
  }
}