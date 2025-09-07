import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/sidebets/[id]/paid - Mark a side bet as paid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { acceptanceId } = body

    const sideBet = await db.sideBet.findUnique({
      where: { id: params.id },
      include: {
        acceptances: true
      }
    })

    if (!sideBet) {
      return NextResponse.json({ error: 'Side bet not found' }, { status: 404 })
    }

    if (!sideBet.isResolved) {
      return NextResponse.json(
        { error: 'Side bet is not yet resolved' },
        { status: 400 }
      )
    }

    // Find the specific acceptance
    const acceptance = sideBet.acceptances.find(a => a.id === acceptanceId)
    if (!acceptance) {
      return NextResponse.json(
        { error: 'Acceptance not found' },
        { status: 404 }
      )
    }

    // Only the winner or acceptor can mark as paid
    const canMarkPaid = user.id === sideBet.proposerId || user.id === acceptance.acceptorId
    if (!canMarkPaid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the acceptance as paid
    await db.sideBetAcceptance.update({
      where: { id: acceptanceId },
      data: { isPaid: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking side bet as paid:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}