import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { SideBetService } from '@/lib/sidebets'

// GET /api/users/[id]/sidebet-stats - Get user's side bet statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only view their own stats (unless admin)
    if (currentUser.id !== params.id && !currentUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stats = await SideBetService.getUserSideBetStats(params.id)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching user side bet stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}