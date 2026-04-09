import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/sidebets - Get all side bets for a game or user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    let where: any = {}

    if (gameId) {
      where.gameId = gameId
    }

    if (userId) {
      where.OR = [
        { proposerId: userId },
        { acceptances: { some: { acceptorId: userId } } }
      ]
    }

    if (status) {
      where.status = status
    }

    const sideBets = await db.sideBet.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(sideBets)
  } catch (error) {
    console.error('Error fetching side bets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sidebets - Create a new side bet
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      gameId,
      betType,
      betSide,
      customLine,
      amount,
      note,
      allowMultiple,
      maxAcceptors
    } = body

    // Validate required fields
    if (!gameId || !betType || !betSide || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate bet type and side
    if (!['SPREAD', 'OVER_UNDER'].includes(betType)) {
      return NextResponse.json(
        { error: 'Invalid bet type' },
        { status: 400 }
      )
    }

    if (betType === 'SPREAD' && !['HOME', 'AWAY'].includes(betSide)) {
      return NextResponse.json(
        { error: 'Invalid bet side for spread' },
        { status: 400 }
      )
    }

    if (betType === 'OVER_UNDER' && !['OVER', 'UNDER'].includes(betSide)) {
      return NextResponse.json(
        { error: 'Invalid bet side for over/under' },
        { status: 400 }
      )
    }

    // Check if game exists and hasn't started
    const game = await db.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    if (new Date() >= game.startTime) {
      return NextResponse.json(
        { error: 'Cannot create side bet for started game' },
        { status: 400 }
      )
    }

    // Create the side bet
    const sideBet = await db.sideBet.create({
      data: {
        gameId,
        proposerId: user.id,
        betType,
        betSide,
        customLine,
        amount,
        note,
        allowMultiple: allowMultiple || false,
        maxAcceptors
      },
      include: {
        game: {
          select: {
            homeTeam: true,
            awayTeam: true,
            spread: true,
            overUnder: true,
            startTime: true
          }
        },
        proposer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(sideBet)
  } catch (error) {
    console.error('Error creating side bet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}