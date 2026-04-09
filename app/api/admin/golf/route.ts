import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/admin/golf — all users with golf enrollment status
export async function GET() {
  try {
    const current = await getCurrentUser()
    if (!current?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, playGolf: true, playFootball: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching golf users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/golf — toggle playGolf / playFootball for a user
// Body: { userId, playGolf?, playFootball? }
export async function PATCH(request: Request) {
  try {
    const current = await getCurrentUser()
    if (!current?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, playGolf, playFootball } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const data: Record<string, boolean> = {}
    if (playGolf !== undefined) data.playGolf = playGolf
    if (playFootball !== undefined) data.playFootball = playFootball

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, playGolf: true, playFootball: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user sports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
