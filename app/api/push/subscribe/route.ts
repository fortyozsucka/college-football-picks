import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ 
        error: 'Invalid subscription data' 
      }, { status: 400 })
    }

    // Get user agent for tracking
    const userAgent = request.headers.get('user-agent') || undefined

    // Create or update push subscription
    const pushSubscription = await db.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint: subscription.endpoint
        }
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent
      }
    })

    // Create default notification preferences if they don't exist
    await db.notificationPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
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

    return NextResponse.json({ 
      success: true, 
      subscriptionId: pushSubscription.id 
    })

  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ 
        error: 'Endpoint is required' 
      }, { status: 400 })
    }

    // Delete the push subscription
    await db.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}