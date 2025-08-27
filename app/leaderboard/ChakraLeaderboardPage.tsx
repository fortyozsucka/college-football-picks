'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Card,
  CardBody,
  VStack,
  HStack,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Avatar,
  useColorModeValue,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Divider,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
  Flex,
  Icon,
} from '@chakra-ui/react'
import { StarIcon, InfoIcon } from '@chakra-ui/icons'
import { useAuth } from '@/lib/context/AuthContext'

interface LeaderboardEntry {
  id: string
  name: string
  email: string
  totalScore: number
  totalPicks: number
  wins: number
  losses: number
  pushes: number
  winPercentage: number
  doubleDowns: number
  doubleDownWins: number
  weeklyStats: Array<{
    picks: number
    points: number
    week: number
    season: number
  }>
}

export default function ChakraLeaderboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const oddRowBg = useColorModeValue('gray.50', 'gray.700')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      const data = await response.json()
      setLeaderboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getRankDisplay = (index: number) => {
    const rank = index + 1
    if (rank === 1) return { emoji: '🥇', color: 'yellow' }
    if (rank === 2) return { emoji: '🥈', color: 'gray' }
    if (rank === 3) return { emoji: '🥉', color: 'orange' }
    return { emoji: `${rank}`, color: 'blue' }
  }

  const getTrophyIcon = (index: number) => {
    if (index === 0) return '🏆'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return ''
  }

  const openUserDetails = (userEntry: LeaderboardEntry) => {
    setSelectedUser(userEntry)
    onOpen()
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={8}>
          <Heading size="xl" textAlign="center">
            🔥 Leaderboard
          </Heading>
          <Spinner size="xl" color="football.500" thickness="4px" />
          <Text color="gray.600">Loading leaderboard...</Text>
        </VStack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Error loading leaderboard!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading 
            size="2xl" 
            bgGradient="linear(to-r, football.600, orange.500)"
            bgClip="text"
            mb={4}
          >
            🔥 Leaderboard
          </Heading>
          <Text fontSize="lg" color="gray.600">
            See how you stack up against the competition
          </Text>
        </Box>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <Card bg="linear-gradient(to-r, var(--chakra-colors-football-50), var(--chakra-colors-orange-50))" shadow="lg">
            <CardBody>
              <Text fontWeight="bold" mb={6} textAlign="center" color="football.800" fontSize="lg">
                🏆 Top Performers
              </Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                {leaderboard.slice(0, 3).map((entry, index) => (
                  <Card 
                    key={entry.id}
                    bg={cardBg}
                    shadow="md"
                    border="2px"
                    borderColor={index === 0 ? 'yellow.300' : index === 1 ? 'gray.300' : 'orange.300'}
                    cursor="pointer"
                    onClick={() => openUserDetails(entry)}
                    _hover={{ transform: 'translateY(-4px)', shadow: 'xl' }}
                    transition="all 0.3s"
                  >
                    <CardBody textAlign="center">
                      <VStack spacing={3}>
                        <Text fontSize="3xl">{getTrophyIcon(index)}</Text>
                        <Avatar 
                          name={entry.name || entry.email} 
                          size="lg"
                          ring="3px"
                          ringColor={index === 0 ? 'yellow.300' : index === 1 ? 'gray.300' : 'orange.300'}
                        />
                        <VStack spacing={1}>
                          <Text fontWeight="bold" fontSize="lg">
                            {entry.name || entry.email}
                          </Text>
                          <Badge
                            colorScheme={index === 0 ? 'yellow' : index === 1 ? 'gray' : 'orange'}
                            variant="solid"
                            px={3}
                            py={1}
                            borderRadius="full"
                          >
                            {entry.totalScore} pts
                          </Badge>
                        </VStack>
                        <SimpleGrid columns={2} spacing={4} w="full">
                          <Stat size="sm">
                            <StatLabel fontSize="xs">Win %</StatLabel>
                            <StatNumber fontSize="md" color="green.600">
                              {entry.winPercentage}%
                            </StatNumber>
                          </Stat>
                          <Stat size="sm">
                            <StatLabel fontSize="xs">Picks</StatLabel>
                            <StatNumber fontSize="md">
                              {entry.totalPicks}
                            </StatNumber>
                          </Stat>
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </CardBody>
          </Card>
        )}

        {/* Full Leaderboard Table */}
        <Card bg={cardBg} shadow="md">
          <CardBody p={0}>
            <Box p={6} pb={4}>
              <Text fontWeight="bold" color="gray.700" fontSize="lg">
                📊 Complete Rankings
              </Text>
            </Box>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Rank</Th>
                    <Th>Player</Th>
                    <Th isNumeric>Points</Th>
                    <Th isNumeric>Picks</Th>
                    <Th isNumeric>Win %</Th>
                    <Th isNumeric>W-L-P</Th>
                    <Th isNumeric>Double Downs</Th>
                    <Th>Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {leaderboard.map((entry, index) => (
                    <Tr
                      key={entry.id}
                      bg={index % 2 === 1 ? oddRowBg : 'transparent'}
                      _hover={{ bg: 'football.50' }}
                      transition="background 0.2s"
                    >
                      <Td>
                        <HStack>
                          <Text fontSize="lg">
                            {getRankDisplay(index).emoji}
                          </Text>
                          {entry.id === user?.id && (
                            <Badge colorScheme="blue" size="sm">You</Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <HStack>
                          <Avatar name={entry.name || entry.email} size="sm" />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium" fontSize="sm">
                              {entry.name || 'No Name'}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {entry.email}
                            </Text>
                          </VStack>
                        </HStack>
                      </Td>
                      <Td isNumeric>
                        <Text 
                          fontWeight="bold" 
                          color={entry.totalScore >= 0 ? 'green.600' : 'red.600'}
                        >
                          {entry.totalScore >= 0 ? '+' : ''}{entry.totalScore}
                        </Text>
                      </Td>
                      <Td isNumeric>{entry.totalPicks}</Td>
                      <Td isNumeric>
                        <VStack spacing={1} align="end">
                          <Text fontWeight="semibold" color="green.600">
                            {entry.winPercentage}%
                          </Text>
                          <Progress 
                            value={entry.winPercentage} 
                            size="xs" 
                            colorScheme="green" 
                            w="60px"
                            borderRadius="full"
                          />
                        </VStack>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="sm">
                          <Text as="span" color="green.600" fontWeight="semibold">{entry.wins}</Text>
                          -
                          <Text as="span" color="red.600" fontWeight="semibold">{entry.losses}</Text>
                          -
                          <Text as="span" color="gray.600">{entry.pushes}</Text>
                        </Text>
                      </Td>
                      <Td isNumeric>
                        <VStack align="end" spacing={0}>
                          <HStack>
                            <Icon as={StarIcon} color="orange.500" boxSize={3} />
                            <Text fontSize="sm" fontWeight="semibold">
                              {entry.doubleDowns}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {entry.doubleDownWins} wins
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="blue"
                          onClick={() => openUserDetails(entry)}
                          leftIcon={<InfoIcon />}
                        >
                          View
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>No data available</AlertTitle>
              <AlertDescription>
                No users have made picks yet. Be the first to get on the leaderboard!
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </VStack>

      {/* User Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Avatar name={selectedUser?.name || selectedUser?.email} />
              <VStack align="start" spacing={0}>
                <Text>{selectedUser?.name || 'No Name'}</Text>
                <Text fontSize="sm" color="gray.500">
                  {selectedUser?.email}
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedUser && (
              <VStack spacing={6} align="stretch">
                {/* Overall Stats */}
                <Card>
                  <CardBody>
                    <Text fontWeight="semibold" mb={4}>📊 Season Statistics</Text>
                    <SimpleGrid columns={2} spacing={4}>
                      <Stat>
                        <StatLabel>Total Points</StatLabel>
                        <StatNumber color={selectedUser.totalScore >= 0 ? 'green.600' : 'red.600'}>
                          {selectedUser.totalScore >= 0 ? '+' : ''}{selectedUser.totalScore}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Total Picks</StatLabel>
                        <StatNumber>{selectedUser.totalPicks}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Win Percentage</StatLabel>
                        <StatNumber color="green.600">{selectedUser.winPercentage}%</StatNumber>
                        <Progress 
                          value={selectedUser.winPercentage} 
                          colorScheme="green" 
                          size="sm" 
                          mt={2}
                          borderRadius="full"
                        />
                      </Stat>
                      <Stat>
                        <StatLabel>Record</StatLabel>
                        <StatHelpText fontSize="md" mt={2}>
                          <Text as="span" color="green.600" fontWeight="bold">{selectedUser.wins}</Text>
                          {' - '}
                          <Text as="span" color="red.600" fontWeight="bold">{selectedUser.losses}</Text>
                          {' - '}
                          <Text as="span" color="gray.600">{selectedUser.pushes}</Text>
                        </StatHelpText>
                      </Stat>
                    </SimpleGrid>

                    <Divider my={4} />

                    <SimpleGrid columns={2} spacing={4}>
                      <Stat>
                        <StatLabel>Double Downs</StatLabel>
                        <StatNumber color="orange.600">
                          {selectedUser.doubleDowns}
                        </StatNumber>
                        <StatHelpText>
                          {selectedUser.doubleDownWins} wins
                        </StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>DD Success Rate</StatLabel>
                        <StatNumber color="orange.600">
                          {selectedUser.doubleDowns > 0 
                            ? Math.round((selectedUser.doubleDownWins / selectedUser.doubleDowns) * 100)
                            : 0}%
                        </StatNumber>
                      </Stat>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Weekly Performance */}
                {selectedUser.weeklyStats && selectedUser.weeklyStats.length > 0 && (
                  <Card>
                    <CardBody>
                      <Text fontWeight="semibold" mb={4}>📅 Weekly Performance</Text>
                      <VStack spacing={3} align="stretch">
                        {selectedUser.weeklyStats
                          .sort((a, b) => b.season - a.season || b.week - a.week)
                          .map((week, index) => (
                          <Flex key={index} justify="space-between" align="center" p={3} bg="gray.50" borderRadius="md">
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="semibold" fontSize="sm">
                                Week {week.week}, {week.season}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                {week.picks} picks made
                              </Text>
                            </VStack>
                            <Badge
                              colorScheme={week.points >= 0 ? 'green' : 'red'}
                              variant="solid"
                              fontSize="sm"
                              px={2}
                              py={1}
                            >
                              {week.points >= 0 ? '+' : ''}{week.points} pts
                            </Badge>
                          </Flex>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}