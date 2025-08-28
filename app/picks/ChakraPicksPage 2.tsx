'use client'

import { useEffect, useState } from 'react'
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
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  useToast,
  Image,
  Divider,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Progress,
  Icon,
} from '@chakra-ui/react'
import { CheckIcon, CloseIcon, StarIcon, TimeIcon } from '@chakra-ui/icons'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/context/AuthContext'
import { Game, Pick } from '@/lib/types'

export default function ChakraPicksPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingPick, setRemovingPick] = useState<string | null>(null)

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      const [gamesResponse, picksResponse] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/picks')
      ])

      if (!gamesResponse.ok || !picksResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const gamesData = await gamesResponse.json()
      const picksData = await picksResponse.json()

      setGames(gamesData || [])
      setPicks(picksData?.filter((pick: Pick) => pick.userId === user?.id) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const removePick = async (gameId: string, pickId: string) => {
    if (!user) return
    
    setRemovingPick(pickId)
    try {
      const response = await fetch(`/api/picks?userId=${user.id}&gameId=${gameId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove pick')
      }

      // Remove the pick from the local state
      setPicks(prevPicks => prevPicks.filter(pick => pick.id !== pickId))
      
      toast({
        title: 'Pick Removed',
        description: 'Your pick has been successfully removed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove pick'
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setRemovingPick(null)
    }
  }

  const getSpreadDisplay = (game: Game): string => {
    if (game.spread > 0) {
      return `${game.homeTeam} -${game.spread}`
    } else if (game.spread < 0) {
      return `${game.awayTeam} -${Math.abs(game.spread)}`
    } else {
      return 'Even'
    }
  }

  const getPickStats = () => {
    const totalPicks = picks.length
    const completedPicks = picks.filter(pick => pick.points !== null)
    const winningPicks = picks.filter(pick => pick.points && pick.points > 0)
    const doubleDownPicks = picks.filter(pick => pick.isDoubleDown)
    const totalPoints = picks.reduce((sum, pick) => sum + (pick.points || 0), 0)

    return {
      totalPicks,
      completedPicks: completedPicks.length,
      winningPicks: winningPicks.length,
      doubleDownPicks: doubleDownPicks.length,
      totalPoints,
      winRate: completedPicks.length > 0 ? Math.round((winningPicks.length / completedPicks.length) * 100) : 0
    }
  }

  const stats = getPickStats()

  if (loading) {
    return (
      <ProtectedRoute>
        <Container maxW="7xl" py={8}>
          <VStack spacing={8}>
            <Heading size="xl" textAlign="center">
              📈 Pick Tracker
            </Heading>
            <Spinner size="xl" color="football.500" thickness="4px" />
            <Text color="gray.600">Loading your picks...</Text>
          </VStack>
        </Container>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Container maxW="7xl" py={8}>
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Error loading picks!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        </Container>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading 
              size="2xl" 
              mb={4}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
            >
              <Text fontSize="2xl">📈</Text>
              <Text 
                bgGradient="linear(to-r, neutral.900, brand.600)"
                bgClip="text"
              >
                Pick Tracker
              </Text>
            </Heading>
            <Text fontSize="lg" color="neutral.600">
              Track your weekly picks and performance
            </Text>
          </Box>

          {/* Stats Overview */}
          <Card bg="linear-gradient(to-r, var(--chakra-colors-football-50), var(--chakra-colors-blue-50))" shadow="md">
            <CardBody>
              <Text fontWeight="semibold" mb={4} color="football.800">
                📊 Your Performance
              </Text>
              <StatGroup>
                <Stat>
                  <StatLabel>Total Picks</StatLabel>
                  <StatNumber color="football.600">{stats.totalPicks}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Completed</StatLabel>
                  <StatNumber color="blue.600">{stats.completedPicks}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Win Rate</StatLabel>
                  <StatNumber color="green.600">{stats.winRate}%</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Points</StatLabel>
                  <StatNumber color={stats.totalPoints >= 0 ? 'green.600' : 'red.600'}>
                    {stats.totalPoints >= 0 ? '+' : ''}{stats.totalPoints}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Double Downs</StatLabel>
                  <StatNumber color="orange.600">{stats.doubleDownPicks}</StatNumber>
                </Stat>
              </StatGroup>
              
              {stats.completedPicks > 0 && (
                <Box mt={4}>
                  <Text fontSize="sm" mb={2} color="gray.600">Progress to Goal</Text>
                  <Progress 
                    value={stats.winRate} 
                    colorScheme="football" 
                    size="md" 
                    borderRadius="md"
                  />
                </Box>
              )}
            </CardBody>
          </Card>

          {/* Picks List */}
          {picks.length === 0 ? (
            <Alert
              status="info"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              height="200px"
              borderRadius="lg"
            >
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                No picks made yet
              </AlertTitle>
              <AlertDescription maxWidth="sm">
                Head over to the Games page to start making your weekly picks!
              </AlertDescription>
              <Button
                as="a"
                href="/games"
                mt={4}
                colorScheme="football"
                size="sm"
              >
                View Games
              </Button>
            </Alert>
          ) : (
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {picks.map((pick) => {
                const game = games.find(g => g.id === pick.gameId)
                if (!game) return null

                const gameStarted = new Date(game.startTime) <= new Date()
                const canRemove = !gameStarted && !game.completed

                return (
                  <PickCard
                    key={pick.id}
                    pick={pick}
                    game={game}
                    canRemove={canRemove}
                    isRemoving={removingPick === pick.id}
                    onRemove={() => removePick(game.id, pick.id)}
                    getSpreadDisplay={getSpreadDisplay}
                  />
                )
              })}
            </SimpleGrid>
          )}
        </VStack>
      </Container>
    </ProtectedRoute>
  )
}

// Pick Card Component
const PickCard = ({ 
  pick, 
  game, 
  canRemove, 
  isRemoving,
  onRemove,
  getSpreadDisplay
}: {
  pick: Pick
  game: Game
  canRemove: boolean
  isRemoving: boolean
  onRemove: () => void
  getSpreadDisplay: (game: Game) => string
}) => {
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const getPickResult = () => {
    if (pick.points === null) return null
    if (pick.points > 0) return 'win'
    if (pick.points === 0) return 'push'
    return 'loss'
  }

  const pickResult = getPickResult()
  const gameStarted = new Date(game.startTime) <= new Date()

  return (
    <Card 
      bg={cardBg} 
      borderColor={borderColor} 
      shadow="md"
      border="2px"
      borderStyle={
        pickResult === 'win' ? 'solid' : 
        pickResult === 'loss' ? 'solid' : 
        'solid'
      }
      borderWidth={pickResult ? '2px' : '1px'}
      _hover={{ shadow: 'lg', transform: 'translateY(-1px)' }}
      transition="all 0.2s"
    >
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack>
              <Badge 
                colorScheme={
                  game.completed ? 'green' : 
                  gameStarted ? 'orange' : 'blue'
                }
              >
                {game.completed ? 'Final' : gameStarted ? 'Live' : 'Upcoming'}
              </Badge>
              {pick.isDoubleDown && (
                <Badge colorScheme="orange" variant="solid">
                  <Icon as={StarIcon} mr={1} />
                  Double Down
                </Badge>
              )}
            </HStack>
            
            <Text fontSize="sm" color="gray.500">
              {new Date(game.startTime).toLocaleDateString()}
            </Text>
          </HStack>

          {/* Teams and Scores */}
          <VStack spacing={3}>
            <HStack justify="space-between" w="full">
              <HStack>
                {game.awayTeamLogo && (
                  <Image src={game.awayTeamLogo} alt={game.awayTeam} boxSize="28px" />
                )}
                <Text fontWeight="semibold" fontSize="sm">{game.awayTeam}</Text>
              </HStack>
              <Text fontWeight="bold">
                {game.awayScore !== null ? game.awayScore : '-'}
              </Text>
            </HStack>

            <Text color="gray.500" fontSize="xs">@</Text>

            <HStack justify="space-between" w="full">
              <HStack>
                {game.homeTeamLogo && (
                  <Image src={game.homeTeamLogo} alt={game.homeTeam} boxSize="28px" />
                )}
                <Text fontWeight="semibold" fontSize="sm">{game.homeTeam}</Text>
              </HStack>
              <Text fontWeight="bold">
                {game.homeScore !== null ? game.homeScore : '-'}
              </Text>
            </HStack>
          </VStack>

          <Divider />

          {/* Pick Info */}
          <VStack spacing={3}>
            <HStack justify="space-between" w="full">
              <Text fontSize="sm" color="gray.600">Your Pick:</Text>
              <HStack>
                <Text fontWeight="bold" color="football.600">
                  {pick.pickedTeam}
                </Text>
                {pick.pickedTeam === pick.pickedTeam && (
                  <CheckIcon color="football.500" boxSize={3} />
                )}
              </HStack>
            </HStack>

            <HStack justify="space-between" w="full">
              <Text fontSize="sm" color="gray.600">Spread:</Text>
              <Text fontSize="sm" fontWeight="medium">
                {getSpreadDisplay(game)}
              </Text>
            </HStack>

            <HStack justify="space-between" w="full">
              <Text fontSize="sm" color="gray.600">Locked Spread:</Text>
              <Text fontSize="sm" fontWeight="medium">
                {pick.lockedSpread > 0 ? `${game.homeTeam} -${pick.lockedSpread}` :
                 pick.lockedSpread < 0 ? `${game.awayTeam} -${Math.abs(pick.lockedSpread)}` :
                 'Even'}
              </Text>
            </HStack>
          </VStack>

          {/* Result */}
          {pick.points !== null && (
            <VStack spacing={2}>
              <Divider />
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Result:</Text>
                <Badge
                  colorScheme={
                    pick.points > 0 ? 'green' : 
                    pick.points === 0 ? 'gray' : 'red'
                  }
                  variant="solid"
                  fontSize="sm"
                  px={2}
                  py={1}
                >
                  {pick.points > 0 ? `+${pick.points} pts` : 
                   pick.points === 0 ? 'Push' : `${pick.points} pts`}
                </Badge>
              </HStack>
            </VStack>
          )}

          {/* Actions */}
          {canRemove && (
            <VStack spacing={2}>
              <Divider />
              <Button
                size="sm"
                variant="ghost"
                colorScheme="red"
                leftIcon={<CloseIcon />}
                onClick={onRemove}
                isLoading={isRemoving}
                loadingText="Removing..."
                w="full"
              >
                Remove Pick
              </Button>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                You can change your pick until the game starts
              </Text>
            </VStack>
          )}

          {gameStarted && !game.completed && (
            <Alert status="info" size="sm" borderRadius="md">
              <AlertIcon />
              <Text fontSize="xs">Game has started - pick is locked</Text>
            </Alert>
          )}
        </VStack>
      </CardBody>
    </Card>
  )
}