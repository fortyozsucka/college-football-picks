import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/sidebets/[id] - Get specific side bet details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sideBet = await db.sideBet.findUnique({
      where: { id: params.id },
      include: {
        game: {
          select: {
            homeTeam: true,
            awayTeam: true,
            spread: true,
            overUnder: true,
            startTime: true,
            completed: true,
            homeScore: true,
            awayScore: true
          }
        },
        proposer: {
          select: {
            id: true,
            name: true,
            venmoHandle: true
          }
        },
        acceptances: {
          include: {
            acceptor: {
              select: {
                id: true,
                name: true,
                venmoHandle: true
              }
            }
          }
        }
      }
    })

    if (!sideBet) {
      return NextResponse.json({ error: 'Side bet not found' }, { status: 404 })
    }

    return NextResponse.json(sideBet)
  } catch (error) {
    console.error('Error fetching side bet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sidebets/[id] - Cancel a side bet (proposer only, before acceptance)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sideBet = await db.sideBet.findUnique({
      where: { id: params.id },
      include: {
        acceptances: true
      }
    })

    if (!sideBet) {
      return NextResponse.json({ error: 'Side bet not found' }, { status: 404 })
    }

    if (sideBet.proposerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (sideBet.acceptances.length > 0) {
      return NextResponse.json(
        { error: 'Cannot cancel bet that has been accepted' },
        { status: 400 }
      )
    }

    await db.sideBet.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling side bet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}