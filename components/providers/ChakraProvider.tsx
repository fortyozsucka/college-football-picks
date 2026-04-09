'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { theme } from '@/lib/theme.client'

export function ChakraUIProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme} resetCSS>
      {children}
    </ChakraProvider>
  )
}