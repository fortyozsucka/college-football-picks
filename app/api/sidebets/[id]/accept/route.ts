import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/sidebets/[id]/accept - Accept a side bet
export async function POST(
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
        game: true,
        acceptances: true
      }
    })

    if (!sideBet) {
      return NextResponse.json({ error: 'Side bet not found' }, { status: 404 })
    }

    // Check if bet is still open
    if (sideBet.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Side bet is no longer open' },
        { status: 400 }
      )
    }

    // Check if game hasn't started
    if (new Date() >= sideBet.game.startTime) {
      return NextResponse.json(
        { error: 'Cannot accept bet for started game' },
        { status: 400 }
      )
    }

    // Check if user is trying to accept their own bet
    if (sideBet.proposerId === user.id) {
      return NextResponse.json(
        { error: 'Cannot accept your own bet' },
        { status: 400 }
      )
    }

    // Check if user has already accepted this bet
    const existingAcceptance = sideBet.acceptances.find(
      a => a.acceptorId === user.id
    )
    if (existingAcceptance) {
      return NextResponse.json(
        { error: 'You have already accepted this bet' },
        { status: 400 }
      )
    }

    // Check if multiple acceptors are allowed
    if (!sideBet.allowMultiple && sideBet.acceptances.length > 0) {
      return NextResponse.json(
        { error: 'This bet only allows one acceptor' },
        { status: 400 }
      )
    }

    // Check max acceptors limit
    if (sideBet.maxAcceptors && sideBet.acceptances.length >= sideBet.maxAcceptors) {
      return NextResponse.json(
        { error: 'Maximum number of acceptors reached' },
        { status: 400 }
      )
    }

    // Create the acceptance
    const acceptance = await db.sideBetAcceptance.create({
      data: {
        sideBetId: params.id,
        acceptorId: user.id
      },
      include: {
        acceptor: {
          select: {
            id: true,
            name: true,
            venmoHandle: true
          }
        }
      }
    })

    // Update side bet status to ACCEPTED if this is the first acceptance
    // or if max acceptors is reached
    const totalAcceptances = sideBet.acceptances.length + 1
    const shouldMarkAccepted = !sideBet.allowMultiple || 
      (sideBet.maxAcceptors && totalAcceptances >= sideBet.maxAcceptors)

    if (shouldMarkAccepted) {
      await db.sideBet.update({
        where: { id: params.id },
        data: { status: 'ACCEPTED' }
      })
    }

    return NextResponse.json(acceptance)
  } catch (error) {
    console.error('Error accepting side bet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sidebets/[id]/accept - Remove acceptance (before game starts)
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
        game: true,
        acceptances: true
      }
    })

    if (!sideBet) {
      return NextResponse.json({ error: 'Side bet not found' }, { status: 404 })
    }

    // Check if game hasn't started
    if (new Date() >= sideBet.game.startTime) {
      return NextResponse.json(
        { error: 'Cannot withdraw acceptance after game starts' },
        { status: 400 }
      )
    }

    // Find and delete the user's acceptance
    const acceptance = sideBet.acceptances.find(a => a.acceptorId === user.id)
    if (!acceptance) {
      return NextResponse.json(
        { error: 'You have not accepted this bet' },
        { status: 400 }
      )
    }

    await db.sideBetAcceptance.delete({
      where: { id: acceptance.id }
    })

    // Update side bet status back to OPEN if no more acceptances
    const remainingAcceptances = sideBet.acceptances.length - 1
    if (remainingAcceptances === 0) {
      await db.sideBet.update({
        where: { id: params.id },
        data: { status: 'OPEN' }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error withdrawing side bet acceptance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}