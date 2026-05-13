import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { EmailService } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    })

    const baseUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    const emailService = new EmailService()
    await emailService.sendEmail({
      to: user.email,
      subject: 'Reset your password — Squad Picks',
      html: generateResetEmail(user.name ?? user.email.split('@')[0], resetUrl),
      text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
    })

    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }
}

function generateResetEmail(name: string, resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0;">🔐 Password Reset</h1>
        <p style="color: #6b7280; font-size: 16px;">Squad Picks</p>
      </div>

      <div style="background: #f9fafb; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
        <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px;">Hi ${name},</p>
        <p style="color: #4b5563; margin: 0 0 16px;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${resetUrl}"
           style="display: inline-block; background: #1a472a; color: white; padding: 14px 32px;
                  border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Or copy this link: ${resetUrl}
      </p>
    </div>
  `
}
