'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  Container,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Alert,
  AlertIcon,
  useColorModeValue,
  Link as ChakraLink,
  InputGroup,
  InputLeftElement,
  Icon,
  Spinner,
  Flex,
} from '@chakra-ui/react'
import { LockIcon } from '@chakra-ui/icons'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  useEffect(() => {
    if (!token) { setValidating(false); return }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then(r => r.json())
      .then(d => setTokenValid(d.valid))
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to reset password')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        <VStack spacing={2} textAlign="center">
          <Heading size="2xl">🔐 New Password</Heading>
          <Text fontSize="lg" color="gray.500">Choose a new password for your account</Text>
        </VStack>

        <Card bg={cardBg} shadow="xl" borderWidth="1px" borderColor={borderColor} w="full">
          <CardBody p={8}>
            {validating ? (
              <Flex justify="center" py={8}><Spinner size="lg" /></Flex>
            ) : !tokenValid ? (
              <VStack spacing={4} textAlign="center">
                <Text fontSize="3xl">⚠️</Text>
                <Heading size="md">Link expired or invalid</Heading>
                <Text color="gray.500">This password reset link has expired or already been used.</Text>
                <ChakraLink as={Link} href="/auth/forgot-password" color="blue.500" fontWeight="semibold">
                  Request a new link
                </ChakraLink>
              </VStack>
            ) : success ? (
              <VStack spacing={4} textAlign="center">
                <Text fontSize="3xl">✅</Text>
                <Heading size="md">Password updated!</Heading>
                <Text color="gray.500">Redirecting you to sign in...</Text>
              </VStack>
            ) : (
              <VStack spacing={6}>
                {error && (
                  <Alert status="error" borderRadius="lg">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}

                <Box as="form" onSubmit={handleSubmit} w="full">
                  <VStack spacing={5}>
                    <FormControl isRequired>
                      <FormLabel fontWeight="semibold">New Password</FormLabel>
                      <InputGroup>
                        <InputLeftElement>
                          <Icon as={LockIcon} color="gray.400" />
                        </InputLeftElement>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          size="lg"
                        />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel fontWeight="semibold">Confirm Password</FormLabel>
                      <InputGroup>
                        <InputLeftElement>
                          <Icon as={LockIcon} color="gray.400" />
                        </InputLeftElement>
                        <Input
                          type="password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          placeholder="Repeat your password"
                          size="lg"
                        />
                      </InputGroup>
                    </FormControl>

                    <Button
                      type="submit"
                      isLoading={loading}
                      loadingText="Updating..."
                      colorScheme="brand"
                      size="lg"
                      w="full"
                    >
                      Update Password
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Flex justify="center" py={12}><Spinner size="lg" /></Flex>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
