import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface GameResult {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  spread: number
  winner: string
  startTime: Date
}

export interface WeeklySummary {
  week: number
  season: number
  userPicks: number
  correctPicks: number
  points: number
  rank: number
  totalUsers: number
  completedGames: GameResult[]
}

export interface InviteInfo {
  inviteCode: string
  inviterName: string
  appUrl: string
}

export class EmailService {
  private fromEmail = 'Squad CFB Picks <picks@your-domain.com>' // Update with your verified domain

  async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: Array.isArray(template.to) ? template.to : [template.to],
        subject: template.subject,
        html: template.html,
        text: template.text
      })
    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }

  generateGameResultsEmail(userEmail: string, userPicks: any[], completedGames: GameResult[]): EmailTemplate {
    const userResults = userPicks.map(pick => {
      const game = completedGames.find(g => g.homeTeam === pick.game.homeTeam && g.awayTeam === pick.game.awayTeam)
      if (!game) return null
      
      const isCorrect = pick.pickedTeam === game.winner
      const points = isCorrect ? (pick.isDoubleDown ? 2 : 1) : 0
      
      return {
        ...pick,
        game,
        isCorrect,
        points
      }
    }).filter(Boolean)

    const totalPoints = userResults.reduce((sum, result) => sum + result.points, 0)

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0;">🏈 Game Results Update</h1>
          <p style="color: #6b7280; font-size: 16px;">Your picks have been scored!</p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Your Performance</h2>
          <p style="font-size: 18px; margin: 10px 0;"><strong>Points Earned: ${totalPoints}</strong></p>
          <p style="color: #6b7280;">Correct Picks: ${userResults.filter(r => r.isCorrect).length}/${userResults.length}</p>
        </div>

        <h3 style="color: #1f2937;">Game Results</h3>
        ${userResults.map(result => `
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px; background: ${result.isCorrect ? '#f0fdf4' : '#fef2f2'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${result.game.homeTeam} ${result.game.homeScore} - ${result.game.awayScore} ${result.game.awayTeam}</strong>
                <br>
                <span style="color: #6b7280; font-size: 14px;">
                  You picked: ${result.pickedTeam} ${result.isDoubleDown ? '(Double Down)' : ''}
                </span>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 18px; font-weight: bold; color: ${result.isCorrect ? '#16a34a' : '#dc2626'};">
                  ${result.isCorrect ? '✓' : '✗'} ${result.points} pts
                </span>
              </div>
            </div>
          </div>
        `).join('')}

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Check the full leaderboard at <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #2563eb;">Squad CFB Picks</a>
          </p>
        </div>
      </div>
    `

    return {
      to: userEmail,
      subject: `🏈 Your picks scored ${totalPoints} points!`,
      html,
      text: `Your picks have been scored! You earned ${totalPoints} points with ${userResults.filter(r => r.isCorrect).length}/${userResults.length} correct picks.`
    }
  }

  generateWeeklySummaryEmail(userEmail: string, summary: WeeklySummary): EmailTemplate {
    const accuracy = summary.userPicks > 0 ? Math.round((summary.correctPicks / summary.userPicks) * 100) : 0

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0;">🏈 Week ${summary.week} Summary</h1>
          <p style="color: #6b7280; font-size: 16px;">Season ${summary.season} • Your weekly recap</p>
        </div>

        <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h2 style="margin: 0 0 10px 0; font-size: 24px;">Your Performance</h2>
          <div style="display: flex; justify-content: space-around; margin-top: 20px;">
            <div>
              <div style="font-size: 28px; font-weight: bold;">${summary.points}</div>
              <div style="font-size: 14px; opacity: 0.8;">Points</div>
            </div>
            <div>
              <div style="font-size: 28px; font-weight: bold;">${accuracy}%</div>
              <div style="font-size: 14px; opacity: 0.8;">Accuracy</div>
            </div>
            <div>
              <div style="font-size: 28px; font-weight: bold;">#${summary.rank}</div>
              <div style="font-size: 14px; opacity: 0.8;">Rank</div>
            </div>
          </div>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-top: 0;">Week Stats</h3>
          <p>Correct Picks: ${summary.correctPicks}/${summary.userPicks}</p>
          <p>Leaderboard Position: ${summary.rank} of ${summary.totalUsers} players</p>
        </div>

        <h3 style="color: #1f2937;">Completed Games This Week</h3>
        ${summary.completedGames.slice(0, 5).map(game => `
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
            <strong>${game.homeTeam} ${game.homeScore} - ${game.awayScore} ${game.awayTeam}</strong>
            <span style="color: #6b7280; font-size: 14px; margin-left: 10px;">Winner: ${game.winner}</span>
          </div>
        `).join('')}
        ${summary.completedGames.length > 5 ? `<p style="color: #6b7280; text-align: center;">...and ${summary.completedGames.length - 5} more games</p>` : ''}

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Full Leaderboard
          </a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
            Thanks for playing Squad CFB Picks!
          </p>
        </div>
      </div>
    `

    return {
      to: userEmail,
      subject: `🏈 Week ${summary.week} Recap - You ranked #${summary.rank}!`,
      html,
      text: `Week ${summary.week} Summary: You earned ${summary.points} points with ${summary.correctPicks}/${summary.userPicks} correct picks. You're ranked #${summary.rank} of ${summary.totalUsers} players.`
    }
  }

  generateInviteEmail(recipientEmail: string, invite: InviteInfo): EmailTemplate {
    const inviteUrl = `${invite.appUrl}/register?invite=${invite.inviteCode}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0;">🏈 You're Invited!</h1>
          <p style="color: #6b7280; font-size: 16px;">Join Squad College Football Picks</p>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">${invite.inviterName} invited you to join their college football picks league!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Make your weekly college football picks, compete with friends, and climb the leaderboard. 
            Pick 5 games each week with one double-down opportunity for extra points.
          </p>

          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px; font-weight: bold;">
              Join Now
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Or copy and paste this link: <br>
            <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
          </p>
        </div>

        <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: white;">How it works:</h3>
          <ul style="color: white; line-height: 1.8;">
            <li>Pick 5 college football games each week</li>
            <li>Choose one game for a "double down" (2 points instead of 1)</li>
            <li>Earn points for correct picks</li>
            <li>Compete on the weekly leaderboard</li>
            <li>Track your season-long performance</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Ready to show off your college football knowledge?
          </p>
        </div>
      </div>
    `

    return {
      to: recipientEmail,
      subject: `🏈 ${invite.inviterName} invited you to join Squad CFB Picks!`,
      html,
      text: `${invite.inviterName} invited you to join Squad College Football Picks! Join the competition by visiting: ${inviteUrl}`
    }
  }
}

export const emailService = new EmailService()