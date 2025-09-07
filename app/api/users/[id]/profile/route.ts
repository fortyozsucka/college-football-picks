import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/users/[id]/profile - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only view their own profile (unless admin)
    if (currentUser.id !== params.id && !currentUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        venmoHandle: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id]/profile - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only update their own profile
    if (currentUser.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { venmoHandle } = body

    // Validate venmo handle format (optional)
    if (venmoHandle && typeof venmoHandle !== 'string') {
      return NextResponse.json(
        { error: 'Invalid venmo handle format' },
        { status: 400 }
      )
    }

    // Clean up venmo handle (remove @ if present, trim whitespace)
    const cleanVenmoHandle = venmoHandle 
      ? venmoHandle.replace(/^@/, '').trim() || null
      : null

    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: { venmoHandle: cleanVenmoHandle },
      select: {
        id: true,
        name: true,
        email: true,
        venmoHandle: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}