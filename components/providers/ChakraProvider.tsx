'use client'

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { theme } from '@/lib/theme'

export function ChakraUIProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme} resetCSS>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {children}
    </ChakraProvider>
  )
}