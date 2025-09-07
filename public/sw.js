// Service Worker for Push Notifications
const CACHE_NAME = 'cfb-picks-v1'

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push event received')
  
  if (!event.data) {
    console.log('❌ No data in push event')
    return
  }

  let data
  try {
    data = event.data.json()
    console.log('📨 Push data:', data)
  } catch (e) {
    console.log('⚠️ Error parsing push data, using fallback')
    data = { title: 'College Football Picks', body: event.data.text() }
  }

  const options = {
    title: data.title || 'College Football Picks',
    body: data.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data
    },
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [100, 50, 100],
    tag: data.tag || 'general'
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
      .then(() => console.log('✅ Notification displayed'))
      .catch(error => console.error('❌ Error showing notification:', error))
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const data = event.notification.data

  if (action === 'dismiss') {
    return
  }

  // Default action or 'view' action
  const urlToOpen = data.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      
      // No existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications())
  }
})

// Sync notifications when back online
async function syncNotifications() {
  try {
    // This could fetch any pending notifications from your API
    // when the user comes back online
    const response = await fetch('/api/notifications/pending')
    if (response.ok) {
      const notifications = await response.json()
      
      notifications.forEach(notification => {
        self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: '/icon-192x192.png',
          data: notification.data
        })
      })
    }
  } catch (error) {
    console.error('Failed to sync notifications:', error)
  }
}

// Handle message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})