import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/context/AuthContext'

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

interface NotificationPreferences {
  id: string
  userId: string
  gameStartReminders: boolean
  gameResults: boolean
  leaderboardUpdates: boolean
  weeklyRecaps: boolean
  friendActivity: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}

interface UsePushNotificationsReturn {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  preferences: NotificationPreferences | null
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>
  sendTestNotification: () => Promise<boolean>
  error: string | null
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth()
  const [isSupported] = useState(() => {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'PushManager' in window
  })
  
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check current subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported || !user) return

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return

      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription status:', err)
    }
  }, [isSupported, user])

  // Fetch notification preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const prefs = await response.json()
        setPreferences(prefs)
      }
    } catch (err) {
      console.error('Error fetching preferences:', err)
    }
  }, [user])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false

    setIsLoading(true)
    setError(null)

    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration()
      
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
      }

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        setIsSubscribed(true)
        return true
      }

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Notification permission denied')
        return false
      }

      // Subscribe to push notifications
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidPublicKey) {
        setError('VAPID public key not configured')
        return false
      }
      
      let subscription
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        })
        
        if (!subscription) {
          throw new Error('Push manager returned null subscription')
        }
      } catch (subscribeError) {
        setError('Failed to create push subscription: ' + (subscribeError instanceof Error ? subscribeError.message : String(subscribeError)))
        return false
      }

      // Prepare subscription data with proper key format
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      }
      
      // Send subscription to server
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription: subscriptionData })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error('Failed to save subscription: ' + errorText)
      }

      setIsSubscribed(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return true

      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setIsSubscribed(false)
        return true
      }

      // Unsubscribe from push service
      await subscription.unsubscribe()

      // Remove subscription from server
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      })

      setIsSubscribed(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user])

  // Update notification preferences
  const updatePreferences = useCallback(async (
    prefs: Partial<NotificationPreferences>
  ): Promise<boolean> => {
    if (!user) return false

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prefs)
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      const updatedPrefs = await response.json()
      setPreferences(updatedPrefs)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Send test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!user) return false

    console.log('🧪 Sending test notification...')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'test',
          notification: {
            title: '🏈 Test Notification',
            body: 'Push notifications are working correctly!',
            url: '/picks',
            tag: 'test'
          }
        })
      })

      console.log('📡 Test notification response:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Test notification failed:', errorText)
        throw new Error('Failed to send test notification: ' + errorText)
      }

      const result = await response.json()
      console.log('✅ Test notification result:', result)
      return true
    } catch (err) {
      console.error('❌ Test notification error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send test notification')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Initialize on mount
  useEffect(() => {
    if (user && isSupported) {
      checkSubscriptionStatus()
      fetchPreferences()
    }
  }, [user, isSupported, checkSubscriptionStatus, fetchPreferences])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
    error
  }
}