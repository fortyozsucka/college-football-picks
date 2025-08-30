import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }

    const invite = await db.invite.findUnique({
      where: { code }
    })

    if (!invite) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid invite code' 
      })
    }

    if (invite.isUsed) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invite code has already been used' 
      })
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invite code has expired' 
      })
    }

    return NextResponse.json({ 
      valid: true, 
      email: invite.email 
    })
  } catch (error) {
    console.error('Error validating invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}