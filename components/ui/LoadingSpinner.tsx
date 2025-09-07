'use client'

import {
  VStack,
  Spinner,
  Text,
  Box,
  useColorModeValue
} from '@chakra-ui/react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  fullPage?: boolean
  color?: string
}

export function LoadingSpinner({ 
  size = 'lg', 
  text = 'Loading...', 
  fullPage = false,
  color 
}: LoadingSpinnerProps) {
  const spinnerColor = color || useColorModeValue('brand.500', 'brand.400')
  const textColor = useColorModeValue('neutral.600', 'neutral.300')
  
  const content = (
    <VStack spacing={4}>
      <Spinner 
        size={size} 
        color={spinnerColor} 
        thickness="4px"
        speed="0.8s"
      />
      {text && (
        <Text color={textColor} fontSize={size === 'xl' ? 'lg' : 'md'}>
          {text}
        </Text>
      )}
    </VStack>
  )

  if (fullPage) {
    return (
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={useColorModeValue('white', 'gray.900')}
        zIndex={9999}
      >
        {content}
      </Box>
    )
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={8}
      minH="200px"
    >
      {content}
    </Box>
  )
}

export function InlineLoader({ size = 'sm', color }: { size?: 'xs' | 'sm' | 'md', color?: string }) {
  return (
    <Spinner 
      size={size} 
      color={color || useColorModeValue('brand.500', 'brand.400')} 
      thickness="3px"
      speed="0.8s"
    />
  )
}