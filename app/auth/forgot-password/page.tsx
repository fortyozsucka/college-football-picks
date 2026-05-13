'use client'

import { useState } from 'react'
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
} from '@chakra-ui/react'
import { EmailIcon, ArrowBackIcon } from '@chakra-ui/icons'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      setSubmitted(true)
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
          <Heading size="2xl">🔐 Reset Password</Heading>
          <Text fontSize="lg" color="gray.500">
            Enter your email and we'll send you a reset link
          </Text>
        </VStack>

        <Card bg={cardBg} shadow="xl" borderWidth="1px" borderColor={borderColor} w="full">
          <CardBody p={8}>
            {submitted ? (
              <VStack spacing={4} textAlign="center">
                <Text fontSize="3xl">📬</Text>
                <Heading size="md">Check your email</Heading>
                <Text color="gray.500">
                  If <strong>{email}</strong> has an account, you'll receive a password reset link shortly.
                </Text>
                <Text fontSize="sm" color="gray.400">
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </Text>
                <ChakraLink as={Link} href="/auth/login" color="blue.500" fontWeight="semibold">
                  Back to sign in
                </ChakraLink>
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
                      <FormLabel fontWeight="semibold">Email Address</FormLabel>
                      <InputGroup>
                        <InputLeftElement>
                          <Icon as={EmailIcon} color="gray.400" />
                        </InputLeftElement>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          size="lg"
                        />
                      </InputGroup>
                    </FormControl>

                    <Button
                      type="submit"
                      isLoading={loading}
                      loadingText="Sending..."
                      colorScheme="brand"
                      size="lg"
                      w="full"
                    >
                      Send Reset Link
                    </Button>
                  </VStack>
                </Box>

                <ChakraLink
                  as={Link}
                  href="/auth/login"
                  color="gray.500"
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <Icon as={ArrowBackIcon} /> Back to sign in
                </ChakraLink>
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  )
}
