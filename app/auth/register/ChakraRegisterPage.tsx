'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Divider,
  Flex,
  FormHelperText,
  Spinner,
  Badge,
  HStack,
} from '@chakra-ui/react'
import { EmailIcon, LockIcon, StarIcon, InfoIcon, CheckIcon } from '@chakra-ui/icons'
import { useAuth } from '@/lib/context/AuthContext'

export default function ChakraRegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validatingInvite, setValidatingInvite] = useState(false)
  
  const { register } = useAuth()
  const router = useRouter()

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const validateInviteCode = async (code: string) => {
    if (!code) return
    
    setValidatingInvite(true)
    try {
      const response = await fetch('/api/invites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      if (data.valid && data.email) {
        setEmail(data.email)
      }
    } catch (err) {
      console.error('Error validating invite:', err)
    } finally {
      setValidatingInvite(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await register(email, password, name, inviteCode)

    if (result.success) {
      router.push('/games')
    } else {
      setError(result.error || 'Registration failed')
    }

    setLoading(false)
  }

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <Heading 
            size="2xl"
            bgGradient="linear(to-r, football.600, orange.500)"
            bgClip="text"
          >
            🚀 Join the Game
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Create your account to start picking winners
          </Text>
        </VStack>

        {/* Registration Form */}
        <Card 
          bg={cardBg} 
          shadow="xl" 
          borderWidth="1px" 
          borderColor={borderColor}
          w="full"
          maxW="400px"
        >
          <CardBody p={8}>
            <VStack spacing={6}>
              <Heading size="lg" color="football.700">
                Create Account
              </Heading>
              
              {error && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <Box as="form" onSubmit={handleSubmit} w="full">
                <VStack spacing={5}>
                  <FormControl isRequired>
                    <FormLabel color="gray.700" fontWeight="semibold">
                      <HStack>
                        <Icon as={StarIcon} color="orange.500" />
                        <Text>Invite Code</Text>
                      </HStack>
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement>
                        <Icon as={StarIcon} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value)
                          if (e.target.value.length >= 8) {
                            validateInviteCode(e.target.value)
                          }
                        }}
                        placeholder="Enter your invite code"
                        focusBorderColor="football.500"
                        size="lg"
                      />
                    </InputGroup>
                    {validatingInvite && (
                      <FormHelperText>
                        <HStack>
                          <Spinner size="xs" color="blue.500" />
                          <Text color="blue.500">Validating invite code...</Text>
                        </HStack>
                      </FormHelperText>
                    )}
                    <FormHelperText>
                      You need an invite code to join the league
                    </FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.700" fontWeight="semibold">
                      Display Name
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement>
                        <Icon as={InfoIcon} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name (optional)"
                        focusBorderColor="football.500"
                        size="lg"
                      />
                    </InputGroup>
                    <FormHelperText>
                      This will be displayed on the leaderboard
                    </FormHelperText>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color="gray.700" fontWeight="semibold">
                      Email Address
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement>
                        <Icon as={EmailIcon} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        focusBorderColor="football.500"
                        size="lg"
                      />
                    </InputGroup>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color="gray.700" fontWeight="semibold">
                      Password
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement>
                        <Icon as={LockIcon} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password (min 6 characters)"
                        focusBorderColor="football.500"
                        size="lg"
                        minLength={6}
                      />
                    </InputGroup>
                    <FormHelperText>
                      Must be at least 6 characters long
                    </FormHelperText>
                  </FormControl>

                  <Button
                    type="submit"
                    isLoading={loading}
                    loadingText="Creating account..."
                    colorScheme="football"
                    size="lg"
                    w="full"
                    leftIcon={<CheckIcon />}
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: 'lg',
                    }}
                    transition="all 0.2s"
                  >
                    Create Account
                  </Button>
                </VStack>
              </Box>

              <Flex align="center" w="full">
                <Divider />
                <Text px={3} color="gray.500" fontSize="sm">
                  or
                </Text>
                <Divider />
              </Flex>

              <Text color="gray.600" textAlign="center">
                Already have an account?{' '}
                <ChakraLink 
                  as={Link} 
                  href="/auth/login" 
                  color="football.600" 
                  fontWeight="semibold"
                  _hover={{ color: 'football.700', textDecoration: 'underline' }}
                >
                  Sign in here
                </ChakraLink>
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Features Info */}
        <Card bg="football.50" borderColor="football.200" borderWidth="1px">
          <CardBody py={4} px={6}>
            <VStack spacing={2}>
              <Text fontSize="sm" color="football.700" fontWeight="semibold" textAlign="center">
                🎯 What you get:
              </Text>
              <HStack justify="center" spacing={4} flexWrap="wrap">
                <Badge colorScheme="green" variant="subtle">Weekly Picks</Badge>
                <Badge colorScheme="orange" variant="subtle">Double Downs</Badge>
                <Badge colorScheme="blue" variant="subtle">Leaderboard</Badge>
                <Badge colorScheme="purple" variant="subtle">Stats Tracking</Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  )
}