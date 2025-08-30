import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { emailService } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Get all invites (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const invites = await db.invite.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new invite (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      select: { isAdmin: true, name: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { email, expiresInDays } = await request.json()

    // Generate unique invite code
    const code = crypto.randomBytes(16).toString('hex')

    // Calculate expiry date if provided
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000))
      : null

    const invite = await db.invite.create({
      data: {
        code,
        email: email || null,
        createdBy: payload.userId as string,
        expiresAt
      }
    })

    // Send invitation email if email was provided
    if (email) {
      try {
        const inviteEmail = emailService.generateInviteEmail(email, {
          inviteCode: code,
          inviterName: user.name || 'Squad CFB Admin',
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        })

        // Only send emails in production with valid API key
        if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_key_for_development') {
          await emailService.sendEmail(inviteEmail)
          console.log(`Invitation email sent to ${email}`)
        } else {
          console.log(`Would send invitation email to ${email}: ${inviteEmail.subject}`)
        }
      } catch (error) {
        console.error(`Failed to send invitation email to ${email}:`, error)
        // Don't fail the invite creation if email fails
      }
    }

    return NextResponse.json(invite)
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete invite (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await db.invite.delete({
      where: { id: inviteId }
    })

    return NextResponse.json({ message: 'Invite deleted' })
  } catch (error) {
    console.error('Error deleting invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}