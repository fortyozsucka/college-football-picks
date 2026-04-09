'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Heading,
  Text,
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
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Button,
  Icon,
  Flex,
  Avatar,
} from '@chakra-ui/react'
import { ArrowBackIcon, StarIcon } from '@chakra-ui/icons'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  spread: number
  completed: boolean
  startTime: string
  week: number
  season: number
}

interface Pick {
  id: string
  selectedTeam: string
  isDoubleDown: boolean
  result: string
  points: number | null
  createdAt: string
  game: Game
}

interface WeeklyPicksData {
  picks: Pick[]
  stats: {
    totalPicks: number
    wins: number
    losses: number
    pushes: number
    pending: number
    totalPoints: number
    doubleDowns: number
    doubleDownWins: number
  }
  user: {
    id: string
    name: string | null
    email: string
  } | null
  week: number
  season: number
}

export default function WeeklyPicksPage({
  params
}: {
  params: { userId: string; season: string; week: string }
}) {
  const router = useRouter()
  const [data, setData] = useState<WeeklyPicksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const titleGradient = useColorModeValue('linear(to-r, neutral.900, brand.600)', 'linear(to-r, neutral.100, brand.400)')
  const oddRowBg = useColorModeValue('gray.50', 'gray.700')
  const textColor = useColorModeValue('neutral.700', 'neutral.200')
  const mutedTextColor = useColorModeValue('neutral.600', 'neutral.300')
  const doubleDownBg = useColorModeValue('orange.50', 'orange.900')

  const fetchWeeklyPicks = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/users/${params.userId}/weekly-picks?week=${params.week}&season=${params.season}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch weekly picks')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [params.userId, params.season, params.week])

  useEffect(() => {
    fetchWeeklyPicks()
  }, [fetchWeeklyPicks])

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'win':
        return { colorScheme: 'green', label: 'WIN' }
      case 'loss':
        return { colorScheme: 'red', label: 'LOSS' }
      case 'push':
        return { colorScheme: 'gray', label: 'PUSH' }
      default:
        return { colorScheme: 'blue', label: 'PENDING' }
    }
  }

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getGameScore = (pick: Pick) => {
    const game = pick.game
    if (!game.completed || game.homeScore === null || game.awayScore === null) {
      return { display: 'vs', detail: formatGameTime(game.startTime) }
    }

    return {
      display: `${game.homeScore} - ${game.awayScore}`,
      detail: 'Final'
    }
  }

  const getSpreadDisplay = (game: Game, selectedTeam: string) => {
    const spread = game.spread
    const isHomeTeam = selectedTeam === game.homeTeam
    const teamSpread = isHomeTeam ? spread : -spread

    if (teamSpread > 0) {
      return `+${teamSpread}`
    } else if (teamSpread < 0) {
      return `${teamSpread}`
    }
    return 'PK'
  }

  const getPickedTeamHighlight = (pick: Pick) => {
    const isHomeTeam = pick.selectedTeam === pick.game.homeTeam
    return isHomeTeam ? 'home' : 'away'
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={8}>
          <Spinner size="xl" color="football.500" thickness="4px" />
          <Text color={mutedTextColor}>Loading weekly picks...</Text>
        </VStack>
      </Container>
    )
  }

  if (error || !data) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Error loading picks!</AlertTitle>
            <AlertDescription>{error || 'No data available'}</AlertDescription>
          </Box>
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Button
            leftIcon={<ArrowBackIcon />}
            variant="ghost"
            onClick={() => router.back()}
            mb={4}
            color={textColor}
          >
            Back to Leaderboard
          </Button>

          <HStack spacing={4} mb={4}>
            <Avatar name={data.user?.name || data.user?.email} size="lg" />
            <VStack align="start" spacing={0}>
              <Heading
                size="xl"
                bgGradient={titleGradient}
                bgClip="text"
              >
                {data.user?.name || 'User'}&apos;s Picks
              </Heading>
              <Text fontSize="lg" color={mutedTextColor}>
                Week {data.week}, {data.season}
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Stats Summary */}
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <Text fontWeight="bold" mb={4} fontSize="lg" color={textColor}>
              📊 Week Summary
            </Text>
            <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
              <Stat>
                <StatLabel>Total Points</StatLabel>
                <StatNumber color={data.stats.totalPoints >= 0 ? 'green.600' : 'red.600'}>
                  {data.stats.totalPoints >= 0 ? '+' : ''}{data.stats.totalPoints}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Record</StatLabel>
                <StatHelpText fontSize="md" mt={2}>
                  <Text as="span" color="green.600" fontWeight="bold">{data.stats.wins}</Text>
                  {'-'}
                  <Text as="span" color="red.600" fontWeight="bold">{data.stats.losses}</Text>
                  {'-'}
                  <Text as="span" color={mutedTextColor}>{data.stats.pushes}</Text>
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Win Rate</StatLabel>
                <StatNumber color="green.600">
                  {data.stats.totalPicks > 0
                    ? Math.round((data.stats.wins / data.stats.totalPicks) * 100)
                    : 0}%
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Double Downs</StatLabel>
                <StatNumber color="orange.600">
                  {data.stats.doubleDownWins}/{data.stats.doubleDowns}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Completed</StatLabel>
                <StatNumber>
                  {data.stats.totalPicks - data.stats.pending}/{data.stats.totalPicks}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Pending</StatLabel>
                <StatNumber color="blue.600">
                  {data.stats.pending}
                </StatNumber>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Picks List */}
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <Text fontWeight="bold" mb={4} fontSize="lg" color={textColor}>
              🏈 Picks Details
            </Text>

            {data.picks.length === 0 ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle>No picks found</AlertTitle>
                  <AlertDescription>
                    No picks were made for this week.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <VStack spacing={4} align="stretch">
                {data.picks.map((pick) => {
                  const resultBadge = getResultBadge(pick.result)
                  const gameScore = getGameScore(pick)
                  const pickedTeam = getPickedTeamHighlight(pick)

                  return (
                    <Card
                      key={pick.id}
                      variant="outline"
                      borderColor={borderColor}
                      bg={pick.isDoubleDown ? doubleDownBg : 'transparent'}
                    >
                      <CardBody>
                        <Flex justify="space-between" align="start" wrap="wrap" gap={4}>
                          {/* Game Info */}
                          <VStack align="start" spacing={2} flex="1" minW="200px">
                            <HStack>
                              <Text
                                fontWeight={pickedTeam === 'away' ? 'bold' : 'normal'}
                                color={pickedTeam === 'away' ? 'football.600' : textColor}
                              >
                                {pick.game.awayTeam}
                              </Text>
                              {pickedTeam === 'away' && (
                                <Text fontSize="sm" color={mutedTextColor}>
                                  ({getSpreadDisplay(pick.game, pick.game.awayTeam)})
                                </Text>
                              )}
                            </HStack>
                            <HStack>
                              <Text
                                fontWeight={pickedTeam === 'home' ? 'bold' : 'normal'}
                                color={pickedTeam === 'home' ? 'football.600' : textColor}
                              >
                                {pick.game.homeTeam}
                              </Text>
                              {pickedTeam === 'home' && (
                                <Text fontSize="sm" color={mutedTextColor}>
                                  ({getSpreadDisplay(pick.game, pick.game.homeTeam)})
                                </Text>
                              )}
                            </HStack>
                            <Text fontSize="sm" color={mutedTextColor}>
                              {gameScore.detail}
                            </Text>
                          </VStack>

                          {/* Score */}
                          <VStack align="center" spacing={1}>
                            <Text fontSize="xs" color={mutedTextColor}>
                              Score
                            </Text>
                            <Text fontSize="lg" fontWeight="bold" color={textColor}>
                              {gameScore.display}
                            </Text>
                          </VStack>

                          {/* Result & Points */}
                          <VStack align="end" spacing={2}>
                            <HStack>
                              {pick.isDoubleDown && (
                                <Badge colorScheme="orange" variant="solid">
                                  <HStack spacing={1}>
                                    <Icon as={StarIcon} boxSize={3} />
                                    <Text>2X</Text>
                                  </HStack>
                                </Badge>
                              )}
                              <Badge
                                colorScheme={resultBadge.colorScheme}
                                variant="solid"
                                fontSize="sm"
                                px={2}
                                py={1}
                              >
                                {resultBadge.label}
                              </Badge>
                            </HStack>
                            <Text
                              fontSize="xl"
                              fontWeight="bold"
                              color={
                                pick.points === null ? 'gray.400' :
                                pick.points > 0 ? 'green.600' :
                                pick.points < 0 ? 'red.600' :
                                'gray.600'
                              }
                            >
                              {pick.points === null ? '-' :
                               pick.points >= 0 ? `+${pick.points}` : pick.points}
                              {' pts'}
                            </Text>
                          </VStack>
                        </Flex>
                      </CardBody>
                    </Card>
                  )
                })}
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  )
}
