'use client'

import React, { Component, ReactNode } from 'react'
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  VStack,
  Text,
  Code,
  Container,
  Heading,
  useColorModeValue
} from '@chakra-ui/react'
import { RepeatIcon } from '@chakra-ui/icons'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Here you could send the error to your error reporting service
    // Example: Sentry.captureException(error, { contexts: { errorBoundary: errorInfo } })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
        onRetry={this.handleRetry}
        showError={this.props.showError}
      />
    }

    return this.props.children
  }
}

function ErrorFallback({ 
  error, 
  errorInfo, 
  onRetry, 
  showError = false 
}: { 
  error: Error | null
  errorInfo: any
  onRetry: () => void
  showError?: boolean
}) {
  const errorBg = useColorModeValue('gray.50', 'gray.800')
  
  return (
    <Container maxW="2xl" py={12}>
      <VStack spacing={6} align="stretch">
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="auto"
          py={8}
          borderRadius="lg"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="2xl">
            Oops! Something went wrong
          </AlertTitle>
          <AlertDescription maxWidth="sm" fontSize="lg">
            We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
          </AlertDescription>
        </Alert>

        <VStack spacing={4}>
          <Button
            leftIcon={<RepeatIcon />}
            onClick={onRetry}
            colorScheme="brand"
            size="lg"
          >
            Try Again
          </Button>

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Reload Page
          </Button>
        </VStack>

        {(showError || process.env.NODE_ENV === 'development') && error && (
          <Box
            bg={errorBg}
            p={4}
            borderRadius="md"
            borderLeft="4px"
            borderColor="red.400"
          >
            <Heading size="sm" color="red.600" mb={2}>
              Error Details:
            </Heading>
            <Code fontSize="sm" p={2} display="block" whiteSpace="pre-wrap">
              {error.message}
            </Code>
            {error.stack && (
              <Box mt={2}>
                <Text fontSize="xs" color="gray.600" mb={1}>Stack trace:</Text>
                <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                  {error.stack}
                </Code>
              </Box>
            )}
          </Box>
        )}
      </VStack>
    </Container>
  )
}

export default ErrorBoundary