'use client'

import { useColorModeValue } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

/**
 * Safe color mode hook that prevents hydration mismatches
 * by defaulting to light mode values during SSR
 */
export function useSafeColorModeValue<T>(lightValue: T, darkValue: T): T {
  const [isClient, setIsClient] = useState(false)
  const colorModeValue = useColorModeValue(lightValue, darkValue)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // During SSR or before hydration, always return the light value
  if (!isClient) {
    return lightValue
  }

  return colorModeValue
}