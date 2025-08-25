import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Squad College Football Picks',
  description: 'Make your college football picks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}