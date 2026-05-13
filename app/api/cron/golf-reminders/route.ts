import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { EmailService } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Runs daily (set up on cron-job.org). Sends pick reminder emails for upcoming golf tournaments.
// - Tuesday: first reminder (2 days before Thursday start)
// - Wednesday: final reminder (1 day before)
// Skips users who have already submitted picks.

export async function GET() {
  try {
    const headersList = headers()
    const cronSecret = headersList.get('Authorization')

    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayUTC = now.getUTCDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu

    // Only run Tuesday (2) and Wednesday (3)
    if (todayUTC !== 2 && todayUTC !== 3) {
      return NextResponse.json({ message: 'No reminders today', action: 'skipped', timestamp: now.toISOString() })
    }

    // Find UPCOMING tournaments whose startDate is within the next 3 days
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const upcomingTournaments = await db.golfTournament.findMany({
      where: {
        status: 'UPCOMING',
        isActive: true,
        startDate: { gte: now, lte: in3Days },
      },
    })

    if (upcomingTournaments.length === 0) {
      return NextResponse.json({ message: 'No upcoming tournaments in range', action: 'skipped', timestamp: now.toISOString() })
    }

    const emailService = new EmailService()
    const results = []

    for (const tournament of upcomingTournaments) {
      // Find enrolled golf users who have NOT submitted picks for this tournament
      const usersWithoutPicks = await db.user.findMany({
        where: {
          playGolf: true,
          golfPicks: { none: { tournamentId: tournament.id } },
        },
        select: { id: true, email: true, name: true },
      })

      if (usersWithoutPicks.length === 0) {
        results.push({ tournament: tournament.name, sent: 0, reason: 'all picked' })
        continue
      }

      const daysUntil = Math.ceil((tournament.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isLastChance = todayUTC === 3 // Wednesday = last chance

      let sent = 0
      let errors = 0

      for (const user of usersWithoutPicks) {
        try {
          await emailService.sendEmail({
            to: user.email,
            subject: isLastChance
              ? `⛳ Last chance! ${tournament.name} picks due tomorrow`
              : `⛳ Reminder: Make your ${tournament.name} picks`,
            html: generateGolfReminderEmail({
              name: user.name ?? user.email.split('@')[0],
              tournamentName: tournament.name,
              startDate: tournament.startDate,
              daysUntil,
              isLastChance,
              entryFee: tournament.entryFee,
            }),
          })
          sent++
        } catch (err) {
          console.error(`Failed to send golf reminder to ${user.email}:`, err)
          errors++
        }
      }

      results.push({ tournament: tournament.name, sent, errors, usersWithoutPicks: usersWithoutPicks.length })
    }

    console.log('Golf reminders sent:', results)
    return NextResponse.json({ success: true, timestamp: now.toISOString(), results })
  } catch (error) {
    console.error('Golf reminder cron failed:', error)
    return NextResponse.json({ error: 'Golf reminder cron failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}

// ─── Email template ───────────────────────────────────────────────────────────

function formatDeadline(startDate: Date): string {
  return startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  })
}

function generateGolfReminderEmail({
  name,
  tournamentName,
  startDate,
  daysUntil,
  isLastChance,
  entryFee,
}: {
  name: string
  tournamentName: string
  startDate: Date
  daysUntil: number
  isLastChance: boolean
  entryFee: number | null
}): string {
  const deadline = formatDeadline(startDate)
  const urgencyColor = isLastChance ? '#dc2626' : '#d97706'
  const urgencyText = isLastChance ? 'LAST CHANCE — picks lock tomorrow!' : `${daysUntil} days left to submit`
  const baseUrl = (process.env.NEXTAUTH_URL || 'https://squadtriangle.com').replace(/\/$/, '')
  const picksUrl = `${baseUrl}/golf/picks`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

      <div style="background: #1a472a; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
        <p style="color: rgba(255,255,255,0.7); font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">Squad Golf</p>
        <h1 style="color: white; margin: 0; font-size: 26px;">⛳ ${tournamentName}</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 15px;">Picks are still open — don't miss out!</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="color: #1f2937; font-size: 16px; margin: 0 0 12px;">Hi ${name},</p>
        <p style="color: #4b5563; margin: 0 0 12px;">
          You haven't submitted your picks for the <strong>${tournamentName}</strong> yet.
          Picks lock when the first tee time Thursday morning — don't get left out!
        </p>
        <div style="background: white; border: 2px solid ${urgencyColor}; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
          <p style="color: ${urgencyColor}; font-weight: bold; font-size: 15px; margin: 0 0 4px;">${urgencyText}</p>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">Submission deadline: <strong>${deadline}</strong></p>
        </div>
        ${entryFee != null ? `<p style="color: #6b7280; font-size: 13px; margin: 8px 0 0;">Entry fee: <strong>$${entryFee}</strong></p>` : ''}
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${picksUrl}"
           style="display: inline-block; background: #1a472a; color: white; padding: 14px 36px;
                  border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Make My Picks →
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        You're receiving this because you're enrolled in the Squad Golf league.
      </p>
    </div>
  `
}
