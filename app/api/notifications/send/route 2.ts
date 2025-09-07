import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { PushNotificationService, PushNotificationPayload } from '@/lib/push-notifications'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const { 
      type, 
      userIds, 
      notification, 
      preference 
    }: {
      type: 'user' | 'users' | 'preference' | 'test'
      userIds?: string[]
      notification: PushNotificationPayload
      preference?: string
    } = body

    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json({ 
        error: 'Invalid notification data' 
      }, { status: 400 })
    }

    let result

    switch (type) {
      case 'test':
        // Send test notification to current user
        result = await PushNotificationService.sendToUser(user.id, notification)
        break

      case 'user':
        // Send to a single user (must be current user or admin)
        const targetUserId = userIds?.[0] || user.id
        if (targetUserId !== user.id) {
          // Check if current user is admin
          if (!user.isAdmin) {
            return NextResponse.json({ 
              error: 'Insufficient permissions' 
            }, { status: 403 })
          }
        }
        result = await PushNotificationService.sendToUser(targetUserId, notification)
        break

      case 'users':
        // Send to multiple users (admin only)
        if (!userIds || userIds.length === 0) {
          return NextResponse.json({ 
            error: 'User IDs are required' 
          }, { status: 400 })
        }
        
        // Check if current user is admin
        if (!user.isAdmin) {
          return NextResponse.json({ 
            error: 'Insufficient permissions' 
          }, { status: 403 })
        }
        
        result = await PushNotificationService.sendToUsers(userIds, notification)
        break

      case 'preference':
        // Send to users with specific preference enabled (admin only)
        if (!preference) {
          return NextResponse.json({ 
            error: 'Preference is required' 
          }, { status: 400 })
        }
        
        // Check if current user is admin
        if (!user.isAdmin) {
          return NextResponse.json({ 
            error: 'Insufficient permissions' 
          }, { status: 403 })
        }
        
        result = await PushNotificationService.sendToUsersWithPreference(
          preference as keyof any, 
          notification
        )
        break

      default:
        return NextResponse.json({ 
          error: 'Invalid notification type' 
        }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}