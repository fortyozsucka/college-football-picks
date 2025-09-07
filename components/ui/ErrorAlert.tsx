'use client'

import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Box,
  useColorModeValue
} from '@chakra-ui/react'

interface ErrorAlertProps {
  error: string | Error | null
  onClose?: () => void
  title?: string
  variant?: 'subtle' | 'solid' | 'left-accent' | 'top-accent'
}

export function ErrorAlert({ 
  error, 
  onClose, 
  title = 'Error',
  variant = 'left-accent'
}: ErrorAlertProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message
  const borderColor = useColorModeValue('red.500', 'red.300')

  return (
    <Alert 
      status="error" 
      variant={variant}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
    >
      <AlertIcon />
      <Box flex="1">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription display="block" mt={1}>
          {errorMessage}
        </AlertDescription>
      </Box>
      {onClose && (
        <CloseButton
          alignSelf="flex-start"
          position="relative"
          right={-1}
          top={-1}
          onClick={onClose}
        />
      )}
    </Alert>
  )
}

interface SuccessAlertProps {
  message: string
  onClose?: () => void
  title?: string
}

export function SuccessAlert({ 
  message, 
  onClose, 
  title = 'Success' 
}: SuccessAlertProps) {
  const borderColor = useColorModeValue('green.500', 'green.300')

  return (
    <Alert 
      status="success" 
      variant="left-accent"
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
    >
      <AlertIcon />
      <Box flex="1">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription display="block" mt={1}>
          {message}
        </AlertDescription>
      </Box>
      {onClose && (
        <CloseButton
          alignSelf="flex-start"
          position="relative"
          right={-1}
          top={-1}
          onClick={onClose}
        />
      )}
    </Alert>
  )
}