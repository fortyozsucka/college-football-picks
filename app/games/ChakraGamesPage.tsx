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
  Input,
  Select,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  useToast,
  Flex,
  Image,
  Divider,
  Stack,
  useColorModeValue,
  Icon,
  InputGroup,
  InputLeftElement,
  Wrap,
  WrapItem,
  ButtonGroup,
  Progress,
  Checkbox,
} from '@chakra-ui/react'
import { SearchIcon, TimeIcon, SettingsIcon, CheckIcon, CloseIcon, StarIcon } from '@chakra-ui/icons'
import Link from 'next/link'
import { Game, Pick } from '@/lib/types'
import { useAuth } from '@/lib/context/AuthContext'
import GameSideBets from '@/components/GameSideBets'
import { determineBowlTier, BowlTier } from '@/lib/game-classification'

interface SyncStatus {
  lastSync: string | null
  lastSyncWeek: string | null
  activeWeeks: Array<{
    week: number
    season: number
    updatedAt: string
  }>
  syncStats: Array<{
    season: number
    week: number
    gameCount: number
    oldestSync: string
    newestSync: string
  }>
}

export default function ChakraGamesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [games, setGames] = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [allPicks, setAllPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [makingPick, setMakingPick] = useState<string | null>(null)
  const [celebratingPicks, setCelebratingPicks] = useState<Set<string>>(new Set())
  const [justMadePick, setJustMadePick] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Color mode values
  const titleGradient = useColorModeValue('linear(to-r, neutral.900, brand.600)', 'linear(to-r, neutral.100, brand.400)')
  
  // Filter states
  const [teamSearch, setTeamSearch] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [spreadRange, setSpreadRange] = useState({ min: '', max: '' })
  const [gameStatus, setGameStatus] = useState('all')

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const getSpreadWinner = (game: Game): string | null => {
    if (!game.completed || game.homeScore === null || game.awayScore === null) {
      return null
    }
    
    const scoreDiff = game.homeScore - game.awayScore
    const adjustedHomeDiff = scoreDiff + game.spread
    
    if (adjustedHomeDiff > 0) {
      return game.homeTeam
    } else if (adjustedHomeDiff < 0) {
      return game.awayTeam
    } else {
      return 'Push'
    }
  }

  const getSpreadDisplay = (game: Game): string => {
    if (game.spread > 0) {
      return `${game.awayTeam} -${game.spread}`
    } else if (game.spread < 0) {
      return `${game.homeTeam} -${Math.abs(game.spread)}`
    } else {
      return 'Even'
    }
  }

  const getGameStatusDisplay = (game: Game): { display: string; color: string; isLive: boolean } => {
    const gameStarted = new Date() >= new Date(game.startTime)
    
    // If game hasn't started yet
    if (!gameStarted) {
      return {
        display: new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: 'gray.500',
        isLive: false
      }
    }

    // If game is completed
    if (game.completed) {
      return {
        display: 'Final',
        color: 'green.600',
        isLive: false
      }
    }

    // If game is in progress
    if (game.status === 'in_progress' && game.period && game.clock) {
      const getQuarterName = (period: number) => {
        if (period <= 4) return `Q${period}`
        return period === 5 ? 'OT' : `${period - 4}OT`
      }
      
      return {
        display: `${getQuarterName(game.period)} ${game.clock}`,
        color: 'red.500',
        isLive: true
      }
    }

    // If game has started but no live data available
    if (gameStarted) {
      return {
        display: 'In Progress',
        color: 'orange.500',
        isLive: true
      }
    }

    // Default fallback
    return {
      display: new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: 'gray.500',
      isLive: false
    }
  }

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      if (!response.ok) throw new Error('Failed to fetch games')
      const data = await response.json()
      setGames(data || [])
      setLastUpdated(new Date())
    } catch (error) {
      setError('Failed to load games')
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPicks = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/picks?userId=${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch picks')
      const data = await response.json()
      setPicks(data || [])
    } catch (error) {
      console.error('Error fetching picks:', error)
    }
  }

  const fetchAllPicks = async () => {
    try {
      const response = await fetch('/api/picks')
      if (!response.ok) throw new Error('Failed to fetch all picks')
      const data = await response.json()
      setAllPicks(data || [])
    } catch (error) {
      console.error('Error fetching all picks:', error)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/games/sync-status')
      if (!response.ok) throw new Error('Failed to fetch sync status')
      const data = await response.json()
      setSyncStatus(data)
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  const handleMakePick = async (gameId: string, team: string, isDoubleDown: boolean = false) => {
    if (!user) return
    
    const game = games.find(g => g.id === gameId)
    if (!game) return
    
    setMakingPick(gameId)
    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          gameId, 
          pickedTeam: team, 
          isDoubleDown,
          lockedSpread: game.spread 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to make pick')
      }

      await fetchPicks()
      await fetchAllPicks()
      setJustMadePick(gameId)
      setCelebratingPicks(prev => new Set([...Array.from(prev), gameId]))
      
      toast({
        title: 'Pick Made!',
        description: `You picked ${team}${isDoubleDown ? ' (Double Down!)' : ''}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      setTimeout(() => {
        setCelebratingPicks(prev => {
          const newSet = new Set(Array.from(prev))
          newSet.delete(gameId)
          return newSet
        })
        setJustMadePick(null)
      }, 2000)

    } catch (error) {
      toast({
        title: 'Error Making Pick',
        description: error instanceof Error ? error.message : 'Failed to make pick',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setMakingPick(null)
    }
  }

  const handleRemovePick = async (gameId: string) => {
    if (!user) return
    
    setMakingPick(gameId)
    try {
      const response = await fetch(`/api/picks?userId=${user.id}&gameId=${gameId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove pick')
      }

      await fetchPicks()
      await fetchAllPicks()
      toast({
        title: 'Pick Removed',
        description: 'Your pick has been removed',
        status: 'info',
        duration: 3000,
        isClosable: true,
      })

    } catch (error) {
      toast({
        title: 'Error Removing Pick',
        description: error instanceof Error ? error.message : 'Failed to remove pick',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setMakingPick(null)
    }
  }

  const handleSyncGames = async () => {
    if (!user?.isAdmin) return
    
    setSyncing(true)
    try {
      const response = await fetch('/api/games/sync', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to sync games')
      
      await fetchGames()
      await fetchSyncStatus()
      
      toast({
        title: 'Games Synced!',
        description: 'Games have been synchronized with CFB API',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: error instanceof Error ? error.message : 'Failed to sync games',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchGames()
    fetchSyncStatus()
    fetchAllPicks()
    if (user) {
      fetchPicks()
    }
  }, [user])

  // Filter games whenever filters or games change
  useEffect(() => {
    let filtered = [...games]
    
    // Team search filter
    if (teamSearch.trim()) {
      const searchTerm = teamSearch.toLowerCase()
      filtered = filtered.filter(game => 
        game.homeTeam.toLowerCase().includes(searchTerm) ||
        game.awayTeam.toLowerCase().includes(searchTerm)
      )
    }
    
    // Time filter
    if (selectedTime) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      
      filtered = filtered.filter(game => {
        const gameDate = new Date(game.startTime)
        switch (selectedTime) {
          case 'today':
            return gameDate >= today && gameDate < tomorrow
          case 'tomorrow':
            const dayAfterTomorrow = new Date(tomorrow)
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)
            return gameDate >= tomorrow && gameDate < dayAfterTomorrow
          case 'week':
            return gameDate >= today && gameDate < nextWeek
          default:
            return true
        }
      })
    }
    
    // Spread range filter
    if (spreadRange.min || spreadRange.max) {
      filtered = filtered.filter(game => {
        const spread = Math.abs(game.spread)
        const min = spreadRange.min ? parseFloat(spreadRange.min) : 0
        const max = spreadRange.max ? parseFloat(spreadRange.max) : Infinity
        return spread >= min && spread <= max
      })
    }
    
    // Game status filter
    if (gameStatus !== 'all') {
      filtered = filtered.filter(game => {
        switch (gameStatus) {
          case 'upcoming':
            return !game.completed && new Date(game.startTime) > new Date()
          case 'live':
            return !game.completed && new Date(game.startTime) <= new Date()
          case 'completed':
            return game.completed
          default:
            return true
        }
      })
    }
    
    setFilteredGames(filtered)
  }, [games, teamSearch, selectedTime, spreadRange, gameStatus])

  const clearFilters = () => {
    setTeamSearch('')
    setSelectedTime('')
    setSpreadRange({ min: '', max: '' })
    setGameStatus('all')
  }

  const hasFilters = teamSearch || selectedTime || spreadRange.min || spreadRange.max || gameStatus !== 'all'

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={8}>
          <Heading size="xl" textAlign="center">
            ⚡ Weekly Games
          </Heading>
          <Spinner size="xl" color="football.500" thickness="4px" />
          <Text color={useColorModeValue("neutral.600", "neutral.300")}>Loading games...</Text>
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
            <AlertTitle>Error loading games!</AlertTitle>
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
            bgGradient={titleGradient}
            bgClip="text"
            mb={4}
          >
            ⚡ Weekly Games
          </Heading>
          <Text fontSize="lg" color={useColorModeValue("neutral.600", "neutral.300")}>
            Make your weekly picks and track game results
          </Text>
          {lastUpdated && (
            <Text fontSize="sm" color="neutral.500" mt={2}>
              <Icon as={TimeIcon} mr={1} />
              Last updated: {lastUpdated.toLocaleString()}
            </Text>
          )}
        </Box>

        {/* Admin Controls */}
        {user?.isAdmin && (
          <Card bg="orange.50" borderColor="orange.200" shadow="md">
            <CardBody>
              <HStack justify="space-between" wrap="wrap" spacing={4}>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold" color="orange.800">
                    🛠️ Admin Controls
                  </Text>
                  <Text fontSize="sm" color="orange.600">
                    Manage game synchronization and system controls
                  </Text>
                </VStack>
                <ButtonGroup>
                  <Button
                    leftIcon={<Icon as={SettingsIcon} />}
                    colorScheme="orange"
                    variant="outline"
                    size="sm"
                    as={Link}
                    href="/admin"
                  >
                    Admin Panel
                  </Button>
                  <Button
                    colorScheme="brand"
                    size="sm"
                    isLoading={syncing}
                    loadingText="Syncing..."
                    onClick={handleSyncGames}
                  >
                    Sync Games
                  </Button>
                </ButtonGroup>
              </HStack>
            </CardBody>
          </Card>
        )}

        {/* Filters */}
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <Text fontWeight="semibold" mb={4} color="gray.700">
              🔍 Filter Games
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <VStack align="start">
                <Text fontSize="sm" fontWeight="medium" color={useColorModeValue("neutral.600", "neutral.300")}>
                  Team Search
                </Text>
                <InputGroup>
                  <InputLeftElement>
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search teams..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                  />
                </InputGroup>
              </VStack>

              <VStack align="start">
                <Text fontSize="sm" fontWeight="medium" color={useColorModeValue("neutral.600", "neutral.300")}>
                  Game Time
                </Text>
                <Select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                >
                  <option value="">All Times</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="week">Next 7 Days</option>
                </Select>
              </VStack>

              <VStack align="start">
                <Text fontSize="sm" fontWeight="medium" color={useColorModeValue("neutral.600", "neutral.300")}>
                  Point Spread
                </Text>
                <HStack>
                  <Input
                    placeholder="Min"
                    type="number"
                    value={spreadRange.min}
                    onChange={(e) => setSpreadRange(prev => ({ ...prev, min: e.target.value }))}
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={spreadRange.max}
                    onChange={(e) => setSpreadRange(prev => ({ ...prev, max: e.target.value }))}
                  />
                </HStack>
              </VStack>

              <VStack align="start">
                <Text fontSize="sm" fontWeight="medium" color={useColorModeValue("neutral.600", "neutral.300")}>
                  Game Status
                </Text>
                <Select
                  value={gameStatus}
                  onChange={(e) => setGameStatus(e.target.value)}
                >
                  <option value="all">All Games</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                </Select>
              </VStack>
            </SimpleGrid>

            {/* Filter Summary */}
            <HStack justify="space-between" mt={4} wrap="wrap">
              <Text fontSize="sm" color={useColorModeValue("neutral.600", "neutral.300")}>
                Showing {filteredGames.length} of {games.length} games
                {hasFilters && (
                  <Badge ml={2} colorScheme="blue" variant="subtle">
                    filtered
                  </Badge>
                )}
              </Text>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<TimeIcon />}
                  onClick={fetchGames}
                  isLoading={loading}
                  loadingText="Refreshing..."
                >
                  Refresh
                </Button>
                {hasFilters && (
                  <Button size="sm" variant="ghost" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </HStack>
            </HStack>
          </CardBody>
        </Card>

        {/* Games List or Empty State */}
        {games.length === 0 ? (
          <Alert
            status="warning"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
            borderRadius="lg"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              No games available for picking
            </AlertTitle>
            <AlertDescription maxWidth="sm" mb={4}>
              No games are currently available. This could be because no weeks are activated 
              by an admin or no games have been synced yet.
            </AlertDescription>
            {user?.isAdmin && (
              <Button
                as={Link}
                href="/admin"
                leftIcon={<SettingsIcon />}
                colorScheme="orange"
                size="sm"
              >
                Manage Weekly Controls
              </Button>
            )}
          </Alert>
        ) : filteredGames.length === 0 ? (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>No games match your filters</AlertTitle>
              <AlertDescription>
                Try adjusting your search criteria or{' '}
                <Button variant="link" size="sm" onClick={clearFilters}>
                  clear all filters
                </Button>
              </AlertDescription>
            </Box>
          </Alert>
        ) : (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {filteredGames.map((game) => {
              const userPick = picks.find(pick => pick.gameId === game.id)
              const isPicking = makingPick === game.id
              const isCelebrating = celebratingPicks.has(game.id)
              const gameStarted = new Date(game.startTime) <= new Date()
              const spreadWinner = getSpreadWinner(game)
              const gamePicks = allPicks.filter(pick => pick.gameId === game.id)

              return (
                <GameCard
                  key={game.id}
                  game={game}
                  userPick={userPick}
                  gamePicks={gamePicks}
                  isPicking={isPicking}
                  isCelebrating={isCelebrating}
                  gameStarted={gameStarted}
                  spreadWinner={spreadWinner}
                  onMakePick={handleMakePick}
                  onRemovePick={handleRemovePick}
                  getSpreadDisplay={getSpreadDisplay}
                  getGameStatusDisplay={getGameStatusDisplay}
                />
              )
            })}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  )
}

// Game Card Component
const GameCard = ({
  game,
  userPick,
  gamePicks,
  isPicking,
  isCelebrating,
  gameStarted,
  spreadWinner,
  onMakePick,
  onRemovePick,
  getSpreadDisplay,
  getGameStatusDisplay
}: {
  game: Game
  userPick?: Pick
  gamePicks: Pick[]
  isPicking: boolean
  isCelebrating: boolean
  gameStarted: boolean
  spreadWinner: string | null
  onMakePick: (gameId: string, team: string, isDoubleDown: boolean) => void
  onRemovePick: (gameId: string) => void
  getSpreadDisplay: (game: Game) => string
  getGameStatusDisplay: (game: Game) => { display: string; color: string; isLive: boolean }
}) => {
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  // Special games (Championship, Bowl, Playoff, Army-Navy) are automatically double-downs
  const isSpecialGame = game.gameType && game.gameType !== 'REGULAR'
  const [isDoubleDown, setIsDoubleDown] = useState(isSpecialGame || false)

  // Update isDoubleDown when game type changes
  useEffect(() => {
    if (isSpecialGame) {
      setIsDoubleDown(true)
    }
  }, [isSpecialGame])

  return (
    <Card 
      bg={cardBg} 
      borderColor={borderColor} 
      shadow="md"
      transform={isCelebrating ? 'scale(1.02)' : 'scale(1)'}
      transition="all 0.3s"
      _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
    >
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Game Header */}
          <HStack justify="space-between" wrap="wrap">
            <Badge colorScheme={game.completed ? 'green' : gameStarted ? 'orange' : 'blue'}>
              {(() => {
                if (game.completed) return 'Final'
                if (!gameStarted) return 'Upcoming'

                const status = getGameStatusDisplay(game)
                if (status.isLive) {
                  return `Live - ${status.display}`
                }
                return 'Live'
              })()}
            </Badge>
            <Text fontSize="sm" color="gray.500">
              {new Date(game.startTime).toLocaleDateString()} {new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </HStack>

          {/* Bowl/Playoff Game Name */}
          {game.notes && (game.gameType === 'BOWL' || game.gameType === 'PLAYOFF') && (
            <Box bg="purple.50" p={2} borderRadius="md" borderLeft="4px" borderColor="purple.500">
              <Text fontSize="sm" fontWeight="bold" color="purple.800">
                🏆 {game.notes}
              </Text>
            </Box>
          )}

          {/* Teams */}
          <VStack spacing={3}>
            {/* Away Team */}
            <HStack justify="space-between" w="full">
              <HStack>
                {game.awayTeamLogo && (
                  <Image src={game.awayTeamLogo} alt={game.awayTeam} boxSize="32px" />
                )}
                <Text fontWeight="semibold">{game.awayTeam}</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg">
                {game.awayScore !== null ? game.awayScore : (gameStarted ? '0' : '-')}
              </Text>
            </HStack>

            <Text color="gray.500" fontSize="sm">@</Text>

            {/* Home Team */}
            <HStack justify="space-between" w="full">
              <HStack>
                {game.homeTeamLogo && (
                  <Image src={game.homeTeamLogo} alt={game.homeTeam} boxSize="32px" />
                )}
                <Text fontWeight="semibold">{game.homeTeam}</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg">
                {game.homeScore !== null ? game.homeScore : (gameStarted ? '0' : '-')}
              </Text>
            </HStack>
          </VStack>


          <Divider />

          {/* Game Info */}
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" color={useColorModeValue("neutral.600", "neutral.300")}>Spread</Text>
              <Text fontWeight="semibold">{getSpreadDisplay(game)}</Text>
            </VStack>
            {game.overUnder && (
              <VStack align="center" spacing={1}>
                <Text fontSize="sm" color={useColorModeValue("neutral.600", "neutral.300")}>O/U</Text>
                <Text fontWeight="semibold">{game.overUnder}</Text>
              </VStack>
            )}
            {game.gameType !== 'REGULAR' && (
              <Badge colorScheme="purple" variant="solid">
                {game.gameType}
              </Badge>
            )}
          </HStack>

          {/* Pick Actions */}
          {!game.completed && !gameStarted && (
            <VStack spacing={3}>
              {!userPick ? (
                <>
                  <VStack spacing={3} w="full">
                    <Text fontSize="sm" color={useColorModeValue("neutral.600", "neutral.300")} textAlign="center">
                      Make your pick:
                    </Text>

                    {/* Show special game notice or regular double-down checkbox */}
                    {isSpecialGame ? (
                      <Alert status="info" variant="subtle" borderRadius="md" py={2}>
                        <AlertIcon />
                        <Text fontSize="xs" fontWeight="semibold">
                          {(() => {
                            // For Bowl and Playoff games, show tier-based scoring
                            if (game.gameType === 'BOWL' || game.gameType === 'PLAYOFF') {
                              const bowlTier = determineBowlTier(game.notes || '', '')
                              if (bowlTier === BowlTier.PREMIUM) {
                                return `${game.gameType} game - Must Pick! (+2 for win, -1 for loss)`
                              } else {
                                return `${game.gameType} game - Must Pick! (+1 for win, 0 for loss)`
                              }
                            }
                            // For other special games (Championship, Army-Navy), show standard message
                            return `${game.gameType} games are automatic double-downs! (+2 for win, -1 for loss)`
                          })()}
                        </Text>
                      </Alert>
                    ) : (
                      <Checkbox
                        isChecked={isDoubleDown}
                        onChange={(e) => setIsDoubleDown(e.target.checked)}
                        colorScheme="orange"
                        size="sm"
                      >
                        <HStack spacing={1}>
                          <Text fontSize="sm">Double Down</Text>
                          <Icon as={StarIcon} color="orange.500" boxSize={3} />
                        </HStack>
                      </Checkbox>
                    )}

                    <ButtonGroup size="sm" width="full" variant="outline">
                      <Button
                        flex={1}
                        onClick={() => onMakePick(game.id, game.awayTeam, isDoubleDown)}
                        isLoading={isPicking}
                        colorScheme={isDoubleDown ? "orange" : "football"}
                        variant={isDoubleDown ? "solid" : "outline"}
                      >
                        {game.awayTeam}
                      </Button>
                      <Button
                        flex={1}
                        onClick={() => onMakePick(game.id, game.homeTeam, isDoubleDown)}
                        isLoading={isPicking}
                        colorScheme={isDoubleDown ? "orange" : "football"}
                        variant={isDoubleDown ? "solid" : "outline"}
                      >
                        {game.homeTeam}
                      </Button>
                    </ButtonGroup>

                    {isDoubleDown && !isSpecialGame && (
                      <Text fontSize="xs" color="orange.600" textAlign="center" fontWeight="semibold">
                        ⭐ Double Down: Worth 2x points!
                      </Text>
                    )}
                  </VStack>
                </>
              ) : (
                <VStack spacing={2}>
                  <HStack>
                    <CheckIcon color="green.500" />
                    <Text fontWeight="semibold">
                      You picked: {userPick.pickedTeam}
                    </Text>
                    {userPick.isDoubleDown && (
                      <Badge colorScheme="orange" variant="solid">
                        Double Down
                      </Badge>
                    )}
                  </HStack>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => onRemovePick(game.id)}
                    isLoading={isPicking}
                  >
                    Remove Pick
                  </Button>
                </VStack>
              )}
            </VStack>
          )}

          {/* Picks Display (when game has started) */}
          {gameStarted && gamePicks.length > 0 && (
            <VStack spacing={3}>
              <Divider />
              <Text fontSize="sm" color={useColorModeValue("neutral.600", "neutral.300")} fontWeight="semibold">Who Picked What:</Text>
              <VStack spacing={2} w="full">
                {[game.homeTeam, game.awayTeam].map((team) => {
                  const teamPicks = gamePicks.filter(pick => pick.pickedTeam === team)
                  if (teamPicks.length === 0) return null
                  
                  return (
                    <HStack key={team} justify="space-between" w="full" p={2} bg="gray.50" borderRadius="md">
                      <Text fontWeight="semibold" fontSize="sm">{team}:</Text>
                      <Wrap spacing={1}>
                        {teamPicks.map((pick) => (
                          <WrapItem key={pick.id}>
                            <Badge 
                              colorScheme={pick.isDoubleDown ? 'orange' : 'blue'}
                              variant={pick.isDoubleDown ? 'solid' : 'outline'}
                              fontSize="xs"
                            >
                              {pick.user.name || pick.user.email}
                              {pick.isDoubleDown && ' ⭐'}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </HStack>
                  )
                })}
              </VStack>
            </VStack>
          )}

          {/* Game Result */}
          {game.completed && spreadWinner && (
            <VStack spacing={2}>
              <Text fontSize="sm" color={useColorModeValue("neutral.600", "neutral.300")}>Spread Winner:</Text>
              <Badge 
                colorScheme={spreadWinner === 'Push' ? 'gray' : 'green'} 
                variant="solid"
                fontSize="sm"
                px={3}
                py={1}
              >
                {spreadWinner}
              </Badge>
              {userPick && (
                <Badge
                  colorScheme={
                    userPick.points === null 
                      ? 'gray' 
                      : userPick.points > 0 
                        ? 'green' 
                        : 'red'
                  }
                  variant="solid"
                >
                  {userPick.points === null 
                    ? 'Not Scored' 
                    : userPick.points > 0 
                      ? `+${userPick.points} pts` 
                      : `${userPick.points} pts`
                  }
                </Badge>
              )}
            </VStack>
          )}

          {/* Side Bets */}
          <GameSideBets game={game} />
        </VStack>
      </CardBody>
    </Card>
  )
}