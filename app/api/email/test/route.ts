import { NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test game results email
    const testGameResults = [
      {
        homeTeam: 'Kansas',
        awayTeam: 'Fresno State',
        homeScore: 31,
        awayScore: 7,
        spread: -14,
        winner: 'Kansas',
        startTime: new Date('2025-08-23T22:30:00.000Z')
      }
    ]

    const testPicks = [
      {
        pickedTeam: 'Kansas',
        isDoubleDown: true,
        game: {
          homeTeam: 'Kansas',
          awayTeam: 'Fresno State'
        }
      }
    ]

    // Generate test emails
    const gameResultsEmail = emailService.generateGameResultsEmail(
      'test@example.com',
      testPicks,
      testGameResults
    )

    const weeklyEmail = emailService.generateWeeklySummaryEmail(
      'test@example.com',
      {
        week: 1,
        season: 2025,
        userPicks: 5,
        correctPicks: 3,
        points: 4,
        rank: 2,
        totalUsers: 10,
        completedGames: testGameResults
      }
    )

    const inviteEmail = emailService.generateInviteEmail(
      'test@example.com',
      {
        inviteCode: 'test123',
        inviterName: 'Test Admin',
        appUrl: 'http://localhost:3000'
      }
    )

    return NextResponse.json({
      message: 'Email templates generated successfully',
      emails: {
        gameResults: {
          subject: gameResultsEmail.subject,
          htmlPreview: gameResultsEmail.html.substring(0, 200) + '...'
        },
        weeklySummary: {
          subject: weeklyEmail.subject,
          htmlPreview: weeklyEmail.html.substring(0, 200) + '...'
        },
        invite: {
          subject: inviteEmail.subject,
          htmlPreview: inviteEmail.html.substring(0, 200) + '...'
        }
      },
      resendConfigured: !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_key_for_development'
    })

  } catch (error) {
    console.error('Error testing emails:', error)
    return NextResponse.json(
      { error: 'Failed to test emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}