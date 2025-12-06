import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateUserPicks, getWeekPickRules, GameType } from '@/lib/game-classification'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const week = searchParams.get('week')
    const season = searchParams.get('season')
    
    // Build where clause based on parameters
    const whereClause: any = {}
    
    if (userId) {
      whereClause.userId = userId
    }
    
    // If week or season are specified, filter by game properties
    if (week || season) {
      whereClause.game = {}
      if (week) whereClause.game.week = parseInt(week)
      if (season) whereClause.game.season = parseInt(season)
    }
    
    const picks = await db.pick.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        game: true
      },
      orderBy: [
        { game: { season: 'desc' } },
        { game: { week: 'desc' } },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(picks)
  } catch (error) {
    console.error('Error fetching picks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch picks' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const gameId = searchParams.get('gameId')
    
    if (!userId || !gameId) {
      return NextResponse.json(
        { error: 'Missing userId or gameId' },
        { status: 400 }
      )
    }

    // Get the game to check if it has started
    const game = await db.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Check if game has already started
    if (new Date() >= game.startTime) {
      return NextResponse.json(
        { error: 'Cannot remove a pick for a game that has already started' },
        { status: 400 }
      )
    }

    // Find the pick to be deleted
    const pickToDelete = await db.pick.findUnique({
      where: {
        userId_gameId: {
          userId: userId,
          gameId: gameId
        }
      }
    })

    if (!pickToDelete) {
      return NextResponse.json(
        { error: 'Pick not found' },
        { status: 404 }
      )
    }

    // Check double down requirement before deletion
    if (pickToDelete.isDoubleDown && (game.gameType === 'REGULAR' || !game.gameType)) {
      // Get all user picks for the same week
      const allWeekPicks = await db.pick.findMany({
        where: {
          userId: userId,
        },
        include: {
          game: {
            select: {
              week: true,
              season: true,
              gameType: true
            }
          }
        }
      })

      const sameWeekPicks = allWeekPicks.filter(pick => 
        pick.game.week === game.week && pick.game.season === game.season
      )

      const regularSeasonPicks = sameWeekPicks.filter(pick => 
        pick.game && (!pick.game.gameType || pick.game.gameType === 'REGULAR')
      )

      // If user has 5 regular season picks and this is their only double down, prevent deletion
      if (regularSeasonPicks.length === 5) {
        const doubleDownCount = regularSeasonPicks.filter(pick => pick.isDoubleDown).length
        if (doubleDownCount === 1) {
          return NextResponse.json(
            { error: 'Cannot remove your double down pick when you have 5 regular season picks. You must have exactly 1 double down.' },
            { status: 400 }
          )
        }
      }
    }

    // Delete the pick
    const deletedPick = await db.pick.delete({
      where: {
        userId_gameId: {
          userId: userId,
          gameId: gameId
        }
      }
    })

    return NextResponse.json({ 
      message: 'Pick removed successfully',
      deletedPick 
    })
  } catch (error) {
    console.error('Error deleting pick:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Pick not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete pick' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const pickData = await request.json()
    
    // Validate required fields
    if (!pickData.userId || !pickData.gameId || !pickData.pickedTeam) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the game to check if it has started and get week/season info
    const game = await db.game.findUnique({
      where: { id: pickData.gameId }
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Check if game has already started
    if (new Date() >= game.startTime) {
      return NextResponse.json(
        { error: 'Cannot pick a game that has already started' },
        { status: 400 }
      )
    }

    // Check special game rules - certain games require double down
    if (game.gameType !== 'REGULAR' && !pickData.isDoubleDown) {
      const gameTypeMessages = {
        'CHAMPIONSHIP': 'Championship games must be double down picks',
        'BOWL': 'Bowl games must be double down picks',
        'PLAYOFF': 'Playoff games must be double down picks',
        'ARMY_NAVY': 'Army-Navy game must be a double down pick'
      }
      
      return NextResponse.json(
        { error: gameTypeMessages[game.gameType] || 'This special game requires a double down pick' },
        { status: 400 }
      )
    }

    // Check if pick already exists
    const existingPick = await db.pick.findUnique({
      where: {
        userId_gameId: {
          userId: pickData.userId,
          gameId: pickData.gameId
        }
      }
    })

    // If this is a new pick, validate weekly limits
    if (!existingPick) {
      // Get all picks for this user for the same week/season
      const weeklyPicks = await db.pick.findMany({
        where: {
          userId: pickData.userId,
        },
        include: {
          game: {
            select: {
              week: true,
              season: true,
              gameType: true
            }
          }
        }
      })

      // Filter picks for the same week/season as the game being picked
      const sameWeekPicks = weeklyPicks.filter(pick => 
        pick.game.week === game.week && pick.game.season === game.season
      )

      // Check if user already has 5 picks for this week
      if (sameWeekPicks.length >= 5) {
        return NextResponse.json(
          { error: 'You can only make 5 picks per week' },
          { status: 400 }
        )
      }

      // If this is a double down pick for a REGULAR game, check if user already has one for this week
      // Special games (Championship, Bowl, Playoff, Army-Navy) can all be double-downs
      if (pickData.isDoubleDown && (game.gameType === 'REGULAR' || !game.gameType)) {
        const existingRegularDoubleDown = sameWeekPicks.find(pick =>
          pick.isDoubleDown && (!pick.game.gameType || pick.game.gameType === 'REGULAR')
        )
        if (existingRegularDoubleDown) {
          return NextResponse.json(
            { error: 'You can only have one double down pick per week for regular season games' },
            { status: 400 }
          )
        }
      }

      // Check double down requirement for regular season games
      // If user will have 5 picks after this one, they must have exactly 1 double down
      const regularSeasonPicks = sameWeekPicks.filter(pick => 
        pick.game && (!pick.game.gameType || pick.game.gameType === 'REGULAR')
      )
      
      if (game.gameType === 'REGULAR' || !game.gameType) {
        const futureRegularPicksCount = regularSeasonPicks.length + 1
        
        if (futureRegularPicksCount === 5) {
          // User will have 5 regular season picks - check double down requirement
          const currentDoubleDowns = regularSeasonPicks.filter(pick => pick.isDoubleDown).length
          const futureDoubleDowns = currentDoubleDowns + (pickData.isDoubleDown ? 1 : 0)
          
          if (futureDoubleDowns === 0) {
            return NextResponse.json(
              { error: 'You must select exactly 1 double down game out of your 5 regular season picks' },
              { status: 400 }
            )
          }
        }
      }
    } else {
      // For existing picks, validate double down rules for REGULAR games only
      // Special games (Championship, Bowl, Playoff, Army-Navy) can all be double-downs
      if (pickData.isDoubleDown && !existingPick.isDoubleDown && (game.gameType === 'REGULAR' || !game.gameType)) {
        // User is trying to make an existing REGULAR game pick a double down
        const weeklyPicks = await db.pick.findMany({
          where: {
            userId: pickData.userId,
          },
          include: {
            game: {
              select: {
                week: true,
                season: true,
                gameType: true
              }
            }
          }
        })

        const sameWeekPicks = weeklyPicks.filter(pick =>
          pick.game.week === game.week && pick.game.season === game.season
        )

        const existingRegularDoubleDown = sameWeekPicks.find(pick =>
          pick.isDoubleDown && pick.id !== existingPick.id && (!pick.game.gameType || pick.game.gameType === 'REGULAR')
        )
        if (existingRegularDoubleDown) {
          return NextResponse.json(
            { error: 'You can only have one double down pick per week for regular season games' },
            { status: 400 }
          )
        }
      }
    }

    if (existingPick) {
      // Update existing pick
      const updatedPick = await db.pick.update({
        where: {
          id: existingPick.id
        },
        data: {
          pickedTeam: pickData.pickedTeam,
          lockedSpread: pickData.lockedSpread,
          isDoubleDown: pickData.isDoubleDown || false,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          game: true
        }
      })

      return NextResponse.json(updatedPick)
    } else {
      // Create new pick
      const newPick = await db.pick.create({
        data: {
          userId: pickData.userId,
          gameId: pickData.gameId,
          pickedTeam: pickData.pickedTeam,
          lockedSpread: pickData.lockedSpread,
          isDoubleDown: pickData.isDoubleDown || false
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          game: true
        }
      })

      return NextResponse.json(newPick)
    }
  } catch (error) {
    console.error('Error creating/updating pick:', error)
    return NextResponse.json(
      { error: 'Failed to create/update pick' },
      { status: 500 }
    )
  }
}