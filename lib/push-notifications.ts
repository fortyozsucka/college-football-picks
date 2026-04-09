import webpush from 'web-push'
import { db } from './db'

// Lazy VAPID initialization — only called at request time, not module load time
let vapidInitialized = false
function ensureVapidInitialized() {
  if (vapidInitialized) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const privateKey = process.env.VAPID_PRIVATE_KEY || ''
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured')
  }
  webpush.setVapidDetails('mailto:your-email@example.com', publicKey, privateKey)
  vapidInitialized = true
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
  data?: Record<string, any>
}

export class PushNotificationService {
  // Send push notification to a specific user
  static async sendToUser(userId: string, payload: PushNotificationPayload) {
    try {
      const subscriptions = await db.pushSubscription.findMany({
        where: { userId }
      })

      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`)
        return { success: false, error: 'No subscriptions found' }
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendToSubscription(sub, payload))
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log(`Push notification results for user ${userId}: ${successful} sent, ${failed} failed`)

      return { success: true, sent: successful, failed }
    } catch (error) {
      console.error('Error sending push notification to user:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Send push notification to multiple users
  static async sendToUsers(userIds: string[], payload: PushNotificationPayload) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return { success: true, sent: successful, failed }
  }

  // Send to all users with a specific preference enabled
  static async sendToUsersWithPreference(
    preference: keyof NotificationPreferences,
    payload: PushNotificationPayload
  ) {
    try {
      const users = await db.user.findMany({
        where: {
          notificationPreferences: {
            [preference]: true,
            pushNotifications: true
          }
        },
        include: {
          pushSubscriptions: true
        }
      })

      const userIds = users.map(u => u.id)
      return await this.sendToUsers(userIds, payload)
    } catch (error) {
      console.error('Error sending notifications by preference:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Send push notification to a specific subscription
  private static async sendToSubscription(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushNotificationPayload
  ) {
    try {
      ensureVapidInitialized()
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      }

      console.log('📤 Sending push notification:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        payload
      })

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload),
        {
          TTL: 24 * 60 * 60, // 24 hours
          urgency: 'normal'
        }
      )

      console.log('✅ Push notification sent successfully')
      return true
    } catch (error) {
      console.error('Error sending to subscription:', error)
      
      // If the subscription is invalid, remove it from the database
      if (error instanceof Error && (
        error.message.includes('410') || 
        error.message.includes('invalid') ||
        error.message.includes('unsubscribed')
      )) {
        try {
          await db.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint }
          })
          console.log('Removed invalid subscription:', subscription.endpoint)
        } catch (dbError) {
          console.error('Error removing invalid subscription:', dbError)
        }
      }
      
      throw error
    }
  }

  // Generate VAPID keys (run this once and store in environment variables)
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys()
  }
}

// Notification templates
export const NotificationTemplates = {
  gameStartingSoon: (homeTeam: string, awayTeam: string, minutesUntilStart: number): PushNotificationPayload => ({
    title: '🏈 Game Starting Soon!',
    body: `${awayTeam} @ ${homeTeam} starts in ${minutesUntilStart} minutes. Make your pick!`,
    url: '/games',
    tag: 'game-starting',
    requireInteraction: true,
    vibrate: [100, 50, 100, 50, 100]
  }),

  pickDeadline: (hoursLeft: number): PushNotificationPayload => ({
    title: '⏰ Pick Deadline Approaching',
    body: `Only ${hoursLeft} hours left to make your weekly picks!`,
    url: '/games',
    tag: 'pick-deadline',
    requireInteraction: true
  }),

  gameResult: (team: string, won: boolean, points: number): PushNotificationPayload => ({
    title: won ? '🎉 Your Pick Won!' : '😞 Your Pick Lost',
    body: won 
      ? `${team} covered! You earned ${points} points.`
      : `${team} didn't cover. ${points} points.`,
    url: '/picks',
    tag: 'game-result',
    vibrate: won ? [100, 50, 100, 50, 100] : [200]
  }),

  weeklyRecap: (wins: number, losses: number, totalPoints: number): PushNotificationPayload => ({
    title: '📊 Weekly Recap',
    body: `Week complete! ${wins}-${losses} record, ${totalPoints >= 0 ? '+' : ''}${totalPoints} points`,
    url: '/leaderboard',
    tag: 'weekly-recap'
  }),

  leaderboardUpdate: (newRank: number, previousRank?: number): PushNotificationPayload => ({
    title: '🏆 Leaderboard Update',
    body: previousRank 
      ? `You moved from #${previousRank} to #${newRank}!`
      : `You're now ranked #${newRank}!`,
    url: '/leaderboard',
    tag: 'leaderboard-update'
  }),

  perfectWeek: (): PushNotificationPayload => ({
    title: '🌟 Perfect Week!',
    body: 'Congratulations! You went 5-0 this week!',
    url: '/picks',
    tag: 'achievement',
    requireInteraction: true,
    vibrate: [100, 50, 100, 50, 100, 50, 100]
  })
}

// Type for notification preferences (should match your Prisma model)
interface NotificationPreferences {
  gameStartReminders: boolean
  gameResults: boolean
  leaderboardUpdates: boolean
  weeklyRecaps: boolean
  friendActivity: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}