const webpush = require('web-push')

console.log('🔑 Generating VAPID keys for web push notifications...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('Add these to your .env file:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`)

console.log('\n✅ VAPID keys generated successfully!')
console.log('\n⚠️  Keep the private key secure and never expose it in client-side code.')