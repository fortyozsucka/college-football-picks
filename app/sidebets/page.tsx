'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Badge,
  SimpleGrid,
  Button,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  Divider,
  useToast
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useSideBets, SideBet } from '@/lib/hooks/useSideBets'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function SideBetsPage() {
  const { user } = useAuth()
  const [allSideBets, setAllSideBets] = useState<SideBet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { formatBetDescription, canAcceptBet, acceptSideBet, cancelSideBet } = useSideBets()
  const toast = useToast()
  
  const bgGradient = useColorModeValue('linear(to-br, gray.50, football.50)', 'linear(to-br, gray.900, football.900)')
  const titleGradient = useColorModeValue('linear(to-r, neutral.900, brand.600)', 'linear(to-r, neutral.100, brand.400)')

  useEffect(() => {
    fetchAllSideBets()
  }, [])

  const fetchAllSideBets = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sidebets')
      if (response.ok) {
        const bets = await response.json()
        setAllSideBets(bets)
      }
    } catch (error) {
      console.error('Error fetching side bets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelBet = async (sideBetId: string) => {
    try {
      await cancelSideBet(sideBetId)
      toast({
        title: 'Bet cancelled',
        description: 'Your side bet has been cancelled successfully',
        status: 'success',
        duration: 3000
      })
      fetchAllSideBets() // Refresh the list
    } catch (error) {
      toast({
        title: 'Error cancelling bet',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000
      })
    }
  }

  // Only show truly open bets (not expired)
  const openBets = allSideBets.filter(bet => 
    bet.status === 'OPEN' && new Date() < new Date(bet.game.startTime)
  )
  const expiredBets = allSideBets.filter(bet => 
    bet.status === 'OPEN' && new Date() >= new Date(bet.game.startTime)
  )
  const userBets = allSideBets.filter(bet => 
    bet.proposerId === user?.id || 
    bet.acceptances?.some(a => a.acceptorId === user?.id)
  )
  const activeBets = userBets.filter(bet => bet.status === 'ACCEPTED')
  const completedBets = userBets.filter(bet => bet.status === 'COMPLETED')
  const cancelledBets = userBets.filter(bet => bet.status === 'CANCELLED')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'green'
      case 'ACCEPTED': return 'blue' 
      case 'COMPLETED': return 'purple'
      case 'CANCELLED': return 'red'
      default: return 'gray'
    }
  }

  return (
    <ProtectedRoute>
      <Box bg={bgGradient} minH="100vh" py={8}>
        <Container maxW="6xl">
          <VStack spacing={8} align="stretch">
            {/* Header */}
            <Box textAlign="center">
              <Heading 
                size="2xl" 
                bgGradient={titleGradient}
                bgClip="text"
                mb={4}
              >
                💰 Side Bets Central
              </Heading>
              <Text fontSize="lg" color={useColorModeValue("neutral.600", "neutral.300")}>
                Browse open side bets, manage your active bets, and track your betting history
              </Text>
            </Box>

            {/* Quick Stats */}
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
              <Card>
                <CardBody textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {openBets.length}
                  </Text>
                  <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>Open Bets</Text>
                </CardBody>
              </Card>
              <Card>
                <CardBody textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                    {activeBets.length}
                  </Text>
                  <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>Your Active</Text>
                </CardBody>
              </Card>
              <Card>
                <CardBody textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                    {completedBets.length}
                  </Text>
                  <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>Completed</Text>
                </CardBody>
              </Card>
              <Card>
                <CardBody textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                    ${userBets.filter(bet => bet.status !== 'CANCELLED').reduce((sum, bet) => sum + bet.amount, 0)}
                  </Text>
                  <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>Total Value</Text>
                </CardBody>
              </Card>
            </SimpleGrid>

            {isLoading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4}>Loading side bets...</Text>
              </Box>
            ) : (
              <VStack spacing={8} align="stretch">
                {/* Open Bets Section */}
                <Card>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between">
                        <Heading size="lg">🔥 Open Side Bets</Heading>
                        <Badge colorScheme="green" size="lg">
                          {openBets.length} available
                        </Badge>
                      </HStack>
                      
                      {openBets.length === 0 ? (
                        <Alert status="info">
                          <AlertIcon />
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">No open side bets right now</Text>
                            <Text fontSize="sm">
                              Check back later or{' '}
                              <Link href="/games" style={{ color: 'blue', textDecoration: 'underline' }}>
                                create your own side bet
                              </Link>{' '}
                              on the games page!
                            </Text>
                          </VStack>
                        </Alert>
                      ) : (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {openBets.map((bet) => (
                            <Card key={bet.id} border="1px" borderColor="green.200" bg="green.50">
                              <CardBody>
                                <VStack spacing={3} align="stretch">
                                  <HStack justify="space-between">
                                    <VStack align="start" spacing={1}>
                                      <Text fontWeight="bold" fontSize="sm">
                                        {bet.proposer.name || 'Anonymous'}
                                      </Text>
                                      <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                                        {bet.game.awayTeam} @ {bet.game.homeTeam}
                                      </Text>
                                      <Text fontSize="xs" color="orange.600" fontWeight="semibold">
                                        🕐 {new Date(bet.game.startTime).toLocaleDateString()} at{' '}
                                        {new Date(bet.game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </Text>
                                    </VStack>
                                    <VStack align="end" spacing={1}>
                                      <Badge colorScheme="green" variant="solid">
                                        ${bet.amount}
                                      </Badge>
                                      {new Date() >= new Date(bet.game.startTime) && (
                                        <Badge colorScheme="red" variant="solid" fontSize="xs">
                                          EXPIRED
                                        </Badge>
                                      )}
                                    </VStack>
                                  </HStack>
                                  
                                  <Box>
                                    <Text fontWeight="semibold">
                                      {formatBetDescription(bet)}
                                    </Text>
                                    {bet.note && (
                                      <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                        &quot;{bet.note}&quot;
                                      </Text>
                                    )}
                                  </Box>

                                  <HStack spacing={2}>
                                    {canAcceptBet(bet) && (
                                      <Button 
                                        size="sm" 
                                        colorScheme="green"
                                        onClick={() => acceptSideBet(bet.id)}
                                      >
                                        Accept ${bet.amount} Bet
                                      </Button>
                                    )}
                                    
                                    {/* Cancel button for proposer */}
                                    {bet.proposerId === user?.id && 
                                     bet.status === 'OPEN' && 
                                     bet.acceptances.length === 0 && (
                                      <Button 
                                        size="sm" 
                                        colorScheme="red"
                                        variant="outline"
                                        onClick={() => handleCancelBet(bet.id)}
                                      >
                                        Cancel Bet
                                      </Button>
                                    )}
                                  </HStack>
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                        </SimpleGrid>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                {/* Expired Bets Section */}
                {expiredBets.length > 0 && (
                  <Card>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between">
                          <Heading size="lg">⏰ Expired Side Bets</Heading>
                          <Badge colorScheme="red" size="lg">
                            {expiredBets.length} expired
                          </Badge>
                        </HStack>
                        
                        <Alert status="warning">
                          <AlertIcon />
                          <Text fontSize="sm">
                            These side bets have expired because their games have started. 
                            They will be automatically cancelled during the next game sync.
                          </Text>
                        </Alert>
                        
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {expiredBets.map((bet) => (
                            <Card key={bet.id} border="1px" borderColor="red.200" bg="red.50" opacity={0.8}>
                              <CardBody>
                                <VStack spacing={3} align="stretch">
                                  <HStack justify="space-between">
                                    <VStack align="start" spacing={1}>
                                      <Text fontWeight="bold" fontSize="sm" color="gray.700">
                                        {bet.proposer.name || 'Anonymous'}
                                      </Text>
                                      <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                                        {bet.game.awayTeam} @ {bet.game.homeTeam}
                                      </Text>
                                      <Text fontSize="xs" color="red.600" fontWeight="semibold">
                                        ❌ Expired at {new Date(bet.game.startTime).toLocaleDateString()} at{' '}
                                        {new Date(bet.game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </Text>
                                    </VStack>
                                    <VStack align="end" spacing={1}>
                                      <Badge colorScheme="red" variant="solid">
                                        ${bet.amount}
                                      </Badge>
                                      <Badge colorScheme="red" variant="solid" fontSize="xs">
                                        EXPIRED
                                      </Badge>
                                    </VStack>
                                  </HStack>
                                  
                                  <Box>
                                    <Text fontWeight="semibold" color={useColorModeValue("gray.600", "gray.300")}>
                                      {formatBetDescription(bet)}
                                    </Text>
                                    {bet.note && (
                                      <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                        &quot;{bet.note}&quot;
                                      </Text>
                                    )}
                                  </Box>
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* User's Active Bets */}
                {userBets.length > 0 && (
                  <Card>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Heading size="lg">🎯 Your Side Bets</Heading>
                        
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {userBets.map((bet) => (
                            <Card key={bet.id} border="1px" borderColor="blue.200">
                              <CardBody>
                                <VStack spacing={2} align="stretch">
                                  <HStack justify="space-between">
                                    <VStack align="start" spacing={1}>
                                      <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                                        {bet.game.awayTeam} @ {bet.game.homeTeam}
                                      </Text>
                                      <Text fontSize="xs" color="gray.500">
                                        {new Date(bet.game.startTime).toLocaleDateString()} at{' '}
                                        {new Date(bet.game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </Text>
                                      <Badge colorScheme={getStatusColor(bet.status)} size="sm">
                                        {bet.status}
                                      </Badge>
                                    </VStack>
                                    <Text fontWeight="bold">${bet.amount}</Text>
                                  </HStack>
                                  
                                  <Text fontSize="sm" fontWeight="semibold">
                                    {formatBetDescription(bet)}
                                  </Text>

                                  <Text fontSize="xs" color="gray.500">
                                    {bet.proposerId === user?.id ? 'You proposed' : 'You accepted'}
                                    {bet.acceptances.length > 0 && ` • ${bet.acceptances.length} acceptance(s)`}
                                  </Text>

                                  {bet.isResolved && bet.winningSide && (
                                    <Alert status={
                                      bet.acceptances.some(a => a.acceptorId === user?.id && a.isWinner) ||
                                      (bet.proposerId === user?.id && bet.betSide === bet.winningSide)
                                        ? 'success' 
                                        : 'error'
                                    } size="sm">
                                      <AlertIcon />
                                      <Text fontSize="sm">
                                        {bet.acceptances.some(a => a.acceptorId === user?.id && a.isWinner) ||
                                        (bet.proposerId === user?.id && bet.betSide === bet.winningSide)
                                          ? `You won! 🎉` 
                                          : `You lost 😞`}
                                      </Text>
                                    </Alert>
                                  )}

                                  {/* Cancel button for unaccepted bets that you proposed */}
                                  {bet.proposerId === user?.id && 
                                   bet.status === 'OPEN' && 
                                   bet.acceptances.length === 0 && 
                                   new Date() < new Date(bet.game.startTime) && (
                                    <Button 
                                      size="sm" 
                                      colorScheme="red"
                                      variant="outline"
                                      onClick={() => handleCancelBet(bet.id)}
                                    >
                                      Cancel Bet
                                    </Button>
                                  )}
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card bg={useColorModeValue("gray.50", "gray.800")}>
                  <CardBody>
                    <VStack spacing={4}>
                      <Heading size="md">Ready to Bet?</Heading>
                      <Text textAlign="center" color={useColorModeValue("gray.600", "gray.400")}>
                        Head over to the games page to create your own side bets or accept existing ones!
                      </Text>
                      <Button as={Link} href="/games" colorScheme="blue" size="lg">
                        🏈 Browse Games & Create Bets
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            )}
          </VStack>
        </Container>
      </Box>
    </ProtectedRoute>
  )
}