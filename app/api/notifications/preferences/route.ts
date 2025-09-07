import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create notification preferences
    let preferences = await db.notificationPreferences.findUnique({
      where: { userId: user.id }
    })

    if (!preferences) {
      preferences = await db.notificationPreferences.create({
        data: {
          userId: user.id,
          gameStartReminders: true,
          gameResults: true,
          leaderboardUpdates: true,
          weeklyRecaps: true,
          friendActivity: true,
          emailNotifications: true,
          pushNotifications: true
        }
      })
    }

    return NextResponse.json(preferences)

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      gameStartReminders,
      gameResults,
      leaderboardUpdates,
      weeklyRecaps,
      friendActivity,
      emailNotifications,
      pushNotifications
    } = body

    // Update notification preferences
    const preferences = await db.notificationPreferences.upsert({
      where: { userId: user.id },
      update: {
        gameStartReminders: gameStartReminders ?? undefined,
        gameResults: gameResults ?? undefined,
        leaderboardUpdates: leaderboardUpdates ?? undefined,
        weeklyRecaps: weeklyRecaps ?? undefined,
        friendActivity: friendActivity ?? undefined,
        emailNotifications: emailNotifications ?? undefined,
        pushNotifications: pushNotifications ?? undefined,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        gameStartReminders: gameStartReminders ?? true,
        gameResults: gameResults ?? true,
        leaderboardUpdates: leaderboardUpdates ?? true,
        weeklyRecaps: weeklyRecaps ?? true,
        friendActivity: friendActivity ?? true,
        emailNotifications: emailNotifications ?? true,
        pushNotifications: pushNotifications ?? true
      }
    })

    return NextResponse.json(preferences)

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}