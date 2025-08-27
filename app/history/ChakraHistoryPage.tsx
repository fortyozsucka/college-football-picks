'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Badge,
  SimpleGrid,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Flex,
  Avatar,
  Icon,
} from '@chakra-ui/react'
import { ArrowBackIcon, CalendarIcon, StarIcon } from '@chakra-ui/icons'

interface HistoricalSeason {
  season: number
  champion: string
  championScore: number
  totalUsers: number
  archivedAt: string
}

interface HistoricalStats {
  season: number
  userId: string
  userName: string
  userEmail: string
  finalScore: number
  totalPicks: number
  correctPicks: number
  winPercentage: number
  doubleDowns: number
  correctDoubleDowns: number
  rank: number
  totalUsers: number
  archivedAt: string
}

interface SeasonDetail {
  season: number
  stats: HistoricalStats[]
  totalUsers: number
  archivedAt: string
}

export default function ChakraHistoryPage() {
  const [seasons, setSeasons] = useState<HistoricalSeason[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [seasonDetail, setSeasonDetail] = useState<SeasonDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const oddRowBg = useColorModeValue('gray.50', 'gray.700')

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/historical-stats')
      if (!response.ok) {
        throw new Error('Failed to fetch historical data')
      }
      const data = await response.json()
      setSeasons(data.seasons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchSeasonDetail = async (season: number) => {
    setDetailLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/historical-stats?season=${season}`)
      if (!response.ok) {
        throw new Error('Failed to fetch season details')
      }
      const data = await response.json()
      setSeasonDetail(data)
      setSelectedSeason(season)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setDetailLoading(false)
    }
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'yellow.500' }
    if (rank === 2) return { emoji: '🥈', color: 'gray.400' }
    if (rank === 3) return { emoji: '🥉', color: 'orange.500' }
    return { emoji: `#${rank}`, color: 'gray.600' }
  }

  const getWinPercentageColor = (percentage: number) => {
    if (percentage >= 60) return 'green.600'
    if (percentage >= 50) return 'yellow.600'
    return 'red.600'
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={8}>
          <Heading size="xl" textAlign="center" display="flex" alignItems="center" justifyContent="center" gap={2}>
            <Text fontSize="xl">📊</Text>
            <Text>Historical Leaderboards</Text>
          </Heading>
          <Spinner size="xl" color="football.500" thickness="4px" />
          <Text color="gray.600">Loading historical data...</Text>
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
            <AlertTitle>Error loading historical data!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
          <Button ml={4} onClick={fetchSeasons} colorScheme="red" size="sm">
            Try Again
          </Button>
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <VStack align="start" spacing={2}>
            <Heading 
              size="2xl"
              display="flex"
              alignItems="center"
              gap={3}
            >
              <Text fontSize="2xl">📊</Text>
              <Text 
                bgGradient="linear(to-r, football.600, orange.500)"
                bgClip="text"
              >
                Historical Leaderboards
              </Text>
            </Heading>
            <Text fontSize="lg" color="gray.600">
              Season champions and final standings
            </Text>
          </VStack>
          
          {selectedSeason && (
            <Button
              leftIcon={<ArrowBackIcon />}
              onClick={() => {
                setSelectedSeason(null)
                setSeasonDetail(null)
              }}
              colorScheme="gray"
              variant="outline"
            >
              Back to Seasons
            </Button>
          )}
        </Flex>

        {seasons.length === 0 ? (
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>No Historical Data Available</AlertTitle>
              <AlertDescription>
                No seasons have been archived yet. Historical data will appear here after an admin archives a completed season.
              </AlertDescription>
            </Box>
          </Alert>
        ) : selectedSeason && seasonDetail ? (
          // Season Detail View
          <Card bg={cardBg} shadow="lg">
            <CardBody>
              <VStack spacing={6} align="stretch">
                {/* Season Header */}
                <Flex 
                  direction={{ base: 'column', md: 'row' }} 
                  justify="space-between" 
                  align={{ base: 'start', md: 'center' }}
                  gap={4}
                >
                  <VStack align="start" spacing={1}>
                    <Heading size="xl" color="football.700">
                      Season {seasonDetail.season} Final Standings
                    </Heading>
                    <HStack>
                      <Icon as={CalendarIcon} color="gray.500" />
                      <Text color="gray.600">
                        {seasonDetail.totalUsers} participants • Archived on{' '}
                        {new Date(seasonDetail.archivedAt).toLocaleDateString()}
                      </Text>
                    </HStack>
                  </VStack>

                  {/* Champion Card */}
                  <Card bg="linear-gradient(to-r, var(--chakra-colors-yellow-50), var(--chakra-colors-orange-50))" 
                        border="2px" borderColor="yellow.300" minW="200px">
                    <CardBody textAlign="center" py={4}>
                      <VStack spacing={2}>
                        <Text fontSize="2xl">👑</Text>
                        <Text fontSize="sm" color="gray.600" fontWeight="semibold">
                          CHAMPION
                        </Text>
                        <Text fontSize="lg" fontWeight="bold" color="gray.900">
                          {seasonDetail.stats[0]?.userName || 'Unknown'}
                        </Text>
                        <Badge colorScheme="yellow" variant="solid" fontSize="md" px={3} py={1}>
                          {seasonDetail.stats[0]?.finalScore || 0} pts
                        </Badge>
                      </VStack>
                    </CardBody>
                  </Card>
                </Flex>

                <Divider />

                {/* Standings Table */}
                {detailLoading ? (
                  <VStack py={8}>
                    <Spinner size="lg" color="football.500" thickness="3px" />
                    <Text color="gray.600">Loading season details...</Text>
                  </VStack>
                ) : (
                  <TableContainer>
                    <Table variant="simple" size="md">
                      <Thead>
                        <Tr>
                          <Th>Rank</Th>
                          <Th>Player</Th>
                          <Th isNumeric>Score</Th>
                          <Th isNumeric>Picks</Th>
                          <Th isNumeric>Win %</Th>
                          <Th isNumeric>Double Downs</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {seasonDetail.stats.map((user, index) => (
                          <Tr
                            key={user.userId}
                            bg={index % 2 === 1 ? oddRowBg : 'transparent'}
                            _hover={{ bg: 'football.50' }}
                          >
                            <Td>
                              <Text
                                fontSize="lg"
                                fontWeight="bold"
                                color={getRankDisplay(user.rank).color}
                              >
                                {getRankDisplay(user.rank).emoji}
                              </Text>
                            </Td>
                            <Td>
                              <HStack>
                                <Avatar name={user.userName} size="sm" />
                                <Text fontWeight="medium">{user.userName}</Text>
                              </HStack>
                            </Td>
                            <Td isNumeric>
                              <Text
                                fontSize="lg"
                                fontWeight="bold"
                                color={user.finalScore >= 0 ? 'green.600' : 'red.600'}
                              >
                                {user.finalScore >= 0 ? '+' : ''}{user.finalScore}
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text>
                                <Text as="span" color="green.600" fontWeight="semibold">
                                  {user.correctPicks}
                                </Text>
                                /{user.totalPicks}
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text
                                fontWeight="semibold"
                                color={getWinPercentageColor(user.winPercentage)}
                              >
                                {user.winPercentage.toFixed(1)}%
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text>
                                <Text as="span" color="orange.600" fontWeight="semibold">
                                  {user.correctDoubleDowns}
                                </Text>
                                /{user.doubleDowns}
                              </Text>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}
              </VStack>
            </CardBody>
          </Card>
        ) : (
          // Seasons Overview
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {seasons.map((season) => (
              <Card
                key={season.season}
                bg={cardBg}
                shadow="lg"
                cursor="pointer"
                onClick={() => fetchSeasonDetail(season.season)}
                _hover={{
                  transform: 'translateY(-4px)',
                  shadow: 'xl',
                  borderColor: 'football.300',
                }}
                transition="all 0.3s"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <CardBody textAlign="center">
                  <VStack spacing={4}>
                    <Heading size="lg" color="football.700">
                      Season {season.season}
                    </Heading>
                    <Text fontSize="4xl">🏆</Text>
                    
                    <VStack spacing={2}>
                      <Text fontSize="lg" fontWeight="bold" color="football.600">
                        {season.champion}
                      </Text>
                      <Badge colorScheme="blue" variant="solid" fontSize="lg" px={3} py={1}>
                        {season.championScore} pts
                      </Badge>
                    </VStack>

                    <Stat textAlign="center">
                      <StatLabel fontSize="sm">Participants</StatLabel>
                      <StatNumber fontSize="xl">{season.totalUsers}</StatNumber>
                      <StatHelpText fontSize="xs">
                        Archived {new Date(season.archivedAt).toLocaleDateString()}
                      </StatHelpText>
                    </Stat>

                    <Divider />

                    <Text
                      color="football.600"
                      fontWeight="semibold"
                      _hover={{ color: 'football.700' }}
                    >
                      View Full Standings →
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  )
}