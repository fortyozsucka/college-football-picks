import type { Metadata } from 'next'
import ChakraNavigationFixed from '@/components/ChakraNavigationFixed'
import { Providers } from './providers'
import { ChakraUIProvider } from '@/components/providers/ChakraProvider'
import { ColorModeScript } from '@chakra-ui/react'
import { themeConfig } from '@/lib/theme.config'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import './globals.css'

export const metadata: Metadata = {
  title: 'Squad College Football Picks',
  description: 'Make your college football picks',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ColorModeScript initialColorMode={themeConfig.initialColorMode} />
        <ChakraUIProvider>
          <Providers>
            <ErrorBoundary>
              <ChakraNavigationFixed />
              {children}
            </ErrorBoundary>
          </Providers>
        </ChakraUIProvider>
      </body>
    </html>
  )
}