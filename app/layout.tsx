import type { Metadata } from 'next'
import ChakraNavigationFixed from '@/components/ChakraNavigationFixed'
import { Providers } from './providers'
import { ChakraUIProvider } from '@/components/providers/ChakraProvider'
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
      <body>
        <ChakraUIProvider>
          <Providers>
            <ChakraNavigationFixed />
            {children}
          </Providers>
        </ChakraUIProvider>
      </body>
    </html>
  )
}