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
} from '@chakra-ui/react'
import { EmailIcon, LockIcon, ViewIcon } from '@chakra-ui/icons'
import { useAuth } from '@/lib/context/AuthContext'

export default function ChakraLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const router = useRouter()

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(email, password)

    if (result.success) {
      router.push('/games')
    } else {
      setError(result.error || 'Login failed')
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
            bgGradient="linear(to-r, neutral.900, brand.600)"
            bgClip="text"
          >
            ✨ Welcome Back
          </Heading>
          <Text fontSize="lg" color="neutral.600">
            Sign in to make your college football picks
          </Text>
        </VStack>

        {/* Login Form */}
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
                Sign In
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
                        placeholder="Enter your password"
                        focusBorderColor="football.500"
                        size="lg"
                      />
                    </InputGroup>
                  </FormControl>

                  <Button
                    type="submit"
                    isLoading={loading}
                    loadingText="Signing in..."
                    colorScheme="brand"
                    size="lg"
                    w="full"
                    leftIcon={<ViewIcon />}
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: 'lg',
                    }}
                    transition="all 0.2s"
                  >
                    Sign In
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

              <Text color="neutral.600" textAlign="center">
                Don&apos;t have an account?{' '}
                <ChakraLink 
                  as={Link} 
                  href="/auth/register" 
                  color="football.600" 
                  fontWeight="semibold"
                  _hover={{ color: 'football.700', textDecoration: 'underline' }}
                >
                  Sign up here
                </ChakraLink>
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Additional Info */}
        <Card bg="football.50" borderColor="football.200" borderWidth="1px">
          <CardBody py={4} px={6}>
            <Text fontSize="sm" color="football.700" textAlign="center">
              🎯 Make your picks and compete with friends!
            </Text>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  )
}