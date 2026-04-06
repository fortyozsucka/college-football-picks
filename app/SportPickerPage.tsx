'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  HStack,
  Button,
  Flex,
  useColorModeValue,
  Badge,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { DarkModeToggle } from '@/components/DarkModeToggle'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function SportPickerPage() {
  const { user, logout } = useAuth()

  const bg = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedText = useColorModeValue('gray.500', 'gray.400')

  return (
    <ProtectedRoute>
      <Box minH="100vh" bg={bg}>
        {/* Minimal top bar */}
        <Box borderBottom="1px" borderColor={borderColor} bg={useColorModeValue('white', 'gray.800')}>
          <Container maxW="7xl">
            <Flex h={14} align="center" justify="space-between">
              <Text fontWeight="bold" fontSize="lg" color={useColorModeValue('gray.800', 'white')}>
                Squad Picks
              </Text>
              <HStack spacing={3}>
                <DarkModeToggle />
                <Text fontSize="sm" color={mutedText}>{user?.name ?? user?.email}</Text>
                {user?.isAdmin && (
                  <Button as={Link} href="/admin" size="xs" colorScheme="red" variant="outline">
                    Admin
                  </Button>
                )}
                <Button size="xs" variant="ghost" colorScheme="red" onClick={logout}>
                  Logout
                </Button>
              </HStack>
            </Flex>
          </Container>
        </Box>

        {/* Sport picker */}
        <Container maxW="2xl" py={{ base: 12, md: 20 }}>
          <VStack spacing={10}>
            <VStack spacing={2} textAlign="center">
              <Heading size="2xl">Choose Your Sport</Heading>
              <Text color={mutedText}>Select which league you want to play</Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={6} w="full">
              {/* Football */}
              <Card
                as={Link}
                href="/picks"
                bg={cardBg}
                border="2px"
                borderColor={borderColor}
                _hover={{ borderColor: 'blue.400', shadow: 'lg', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <CardBody>
                  <VStack spacing={4} align="center" py={6}>
                    <Text fontSize="5xl">🏈</Text>
                    <VStack spacing={1}>
                      <Heading size="md">College Football</Heading>
                      <Text fontSize="sm" color={mutedText} textAlign="center">
                        Weekly picks, double downs, and leaderboard
                      </Text>
                    </VStack>
                    <Button colorScheme="blue" size="sm" w="full">
                      Enter
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Golf */}
              {user?.playGolf ? (
                <Card
                  as={Link}
                  href="/golf"
                  bg={cardBg}
                  border="2px"
                  borderColor={borderColor}
                  _hover={{ borderColor: 'green.400', shadow: 'lg', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                  cursor="pointer"
                >
                  <CardBody>
                    <VStack spacing={4} align="center" py={6}>
                      <Text fontSize="5xl">⛳</Text>
                      <VStack spacing={1}>
                        <Heading size="md">Squad Golf</Heading>
                        <Text fontSize="sm" color={mutedText} textAlign="center">
                          Majors & The Players Championship picks
                        </Text>
                      </VStack>
                      <Button colorScheme="green" size="sm" w="full">
                        Enter
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <Card
                  bg={cardBg}
                  border="2px"
                  borderColor={borderColor}
                  opacity={0.5}
                >
                  <CardBody>
                    <VStack spacing={4} align="center" py={6}>
                      <Text fontSize="5xl">⛳</Text>
                      <VStack spacing={1}>
                        <HStack>
                          <Heading size="md">Squad Golf</Heading>
                          <Badge colorScheme="gray" fontSize="xs">Not enrolled</Badge>
                        </HStack>
                        <Text fontSize="sm" color={mutedText} textAlign="center">
                          Ask an admin to enable golf access
                        </Text>
                      </VStack>
                      <Button colorScheme="green" size="sm" w="full" isDisabled>
                        Enter
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>
    </ProtectedRoute>
  )
}
