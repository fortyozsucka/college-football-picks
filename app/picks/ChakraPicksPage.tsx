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
  Select,
  Flex,
} from '@chakra-ui/react'
import { CheckIcon, CloseIcon, StarIcon, TimeIcon } from '@chakra-ui/icons'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/context/AuthContext'
import { Game, Pick } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeading } from '@/components/ui/PageHeading'

export default function ChakraPicksPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  
  // Color mode values
  const titleGradient = useColorModeValue('linear(to-r, neutral.900, brand.600)', 'linear(to-r, neutral.100, brand.400)')
  const [error, setError] = useState<string | null>(null)
  const [removingPick, setRemovingPick] = useState<string | null>(null)
  const [availableWeeks, setAvailableWeeks] = useState<{week: number, season: number, gameCount: number}[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('current') // 'current' or 'week-season' format
  const [weekLabel, setWeekLabel] = useState<string>('College Football')
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  useEffect(() => {
    if (user) {
      fetchAvailableWeeks()
      fetchData()
    }
  }, [user])

  useEffect(() => {
    if (user && availableWeeks.length > 0) {
      fetchData()
    }
  }, [user, selectedWeek, availableWeeks])

  const fetchAvailableWeeks = async () => {
    try {
      // Fetch all weeks that have games or picks
      const response = await fetch('/api/weeks/available')
      if (response.ok) {
        const weeks = await response.json()
        setAvailableWeeks(weeks || [])
      }
    } catch (err) {
      console.warn('Could not fetch available weeks:', err)
      // Don't set error state, just continue with current games
    }
  }

  const fetchData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Always fetch games first to determine current active week
      const gamesResponse = await fetch('/api/games')
      if (!gamesResponse.ok) {
        throw new Error('Failed to fetch games')
      }
      const gamesData = await gamesResponse.json()
      
      // Determine the current active week from the games
      let activeWeek = null
      let activeSeason = null
      if (gamesData && gamesData.length > 0) {
        // Get the most common week/season from active games (games API only returns active weeks)
        const weekCounts = gamesData.reduce((acc: any, game: any) => {
          const key = `${game.week}-${game.season}`
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})
        const mostCommonWeek = Object.keys(weekCounts).reduce((a, b) => weekCounts[a] > weekCounts[b] ? a : b)
        const [week, season] = mostCommonWeek.split('-').map(Number)
        activeWeek = week
        activeSeason = season
        setWeekLabel(`Week ${week} · ${season}`)
      }
      
      // Determine picks URL based on selected week
      let picksUrl = `/api/picks?userId=${user.id}`
      
      if (selectedWeek === 'current') {
        // For current week, filter to active week if we found one
        if (activeWeek && activeSeason) {
          picksUrl = `/api/picks?userId=${user.id}&week=${activeWeek}&season=${activeSeason}`
        }
      } else {
        // Parse week-season format like "2-2024" for historical weeks
        const [week, season] = selectedWeek.split('-').map(Number)
        if (week && season) {
          picksUrl = `/api/picks?userId=${user.id}&week=${week}&season=${season}`
        }
      }

      const picksResponse = await fetch(picksUrl)
      if (!picksResponse.ok) {
        throw new Error('Failed to fetch picks')
      }
      const picksData = await picksResponse.json()

      // Set games and picks based on what we're viewing
      if (selectedWeek === 'current') {
        // Current week: show active games
        setGames(gamesData || [])
      } else {
        // Historical week: only show games that have picks
        if (picksData.length > 0) {
          const relevantGames = picksData.map((pick: Pick) => pick.game).filter(Boolean)
          setGames(relevantGames || [])
        } else {
          setGames([])
        }
      }
      
      setPicks(picksData || [])
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

  const confirmRemovePick = (gameId: string, pickId: string, teamName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Pick',
      message: `Are you sure you want to remove your pick for ${teamName}? You can change your pick until the game starts.`,
      onConfirm: () => removePick(gameId, pickId)
    })
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

  const getPickStats = () => {
    // Picks are already filtered by week from fetchData, so use them directly
    const totalPicks = picks.length
    const completedPicks = picks.filter(pick => pick.points !== null)
    const winningPicks = picks.filter(pick => pick.points && pick.points > 0)
    const doubleDownPicks = picks.filter(pick => pick.isDoubleDown)
    const totalPoints = picks.reduce((sum, pick) => sum + (pick.points || 0), 0)

    // Calculate regular season picks and double down requirement
    const regularSeasonPicks = picks.filter(pick => 
      pick.game && (!pick.game.gameType || pick.game.gameType === 'REGULAR')
    )
    const regularDoubleDowns = regularSeasonPicks.filter(pick => pick.isDoubleDown).length
    const needsDoubleDown = regularSeasonPicks.length >= 5 && regularDoubleDowns === 0

    // Get current week info for display
    let weekInfo = 'Current Week'
    if (selectedWeek !== 'current') {
      const [week, season] = selectedWeek.split('-')
      weekInfo = `Week ${week} ${season}`
    }

    return {
      totalPicks,
      completedPicks: completedPicks.length,
      winningPicks: winningPicks.length,
      doubleDownPicks: doubleDownPicks.length,
      totalPoints,
      winRate: completedPicks.length > 0 ? Math.round((winningPicks.length / completedPicks.length) * 100) : 0,
      regularSeasonPicks: regularSeasonPicks.length,
      regularDoubleDowns,
      needsDoubleDown,
      weekInfo
    }
  }

  const stats = getPickStats()

  if (loading) {
    return (
      <ProtectedRoute>
        <Container maxW="7xl" py={8}>
          <LoadingSpinner 
            size="xl" 
            text="Loading your picks..." 
          />
        </Container>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Container maxW="7xl" py={8}>
          <ErrorAlert 
            error={error}
            title="Error loading picks!"
            onClose={() => setError(null)}
          />
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
            <PageHeading
              eyebrow={selectedWeek !== 'current' ? `Week ${selectedWeek.split('-')[0]} · ${selectedWeek.split('-')[1]}` : weekLabel}
              title="My Picks"
              subtitle="Track your weekly picks and performance"
            />
            
            {/* Week Selection */}
            <Flex justify="center" align="center" gap={4} mb={selectedWeek !== 'current' ? 4 : 0}>
              <Text fontSize="md" fontWeight="semibold" color="neutral.700">
                View Picks For:
              </Text>
              <Select 
                value={selectedWeek} 
                onChange={(e) => setSelectedWeek(e.target.value)}
                maxW="200px"
                bg={cardBg}
                borderColor={borderColor}
              >
                <option value="current">Current Week</option>
                {availableWeeks
                  .filter(week => week.gameCount > 0)
                  .map(week => (
                    <option key={`${week.week}-${week.season}`} value={`${week.week}-${week.season}`}>
                      Week {week.week} {week.season} ({week.gameCount} games)
                    </option>
                  ))
                }
              </Select>
            </Flex>
            
            {/* Historical View Badge */}
            {selectedWeek !== 'current' && (
              <Badge colorScheme="purple" fontSize="sm" p={2} borderRadius="md">
                Historical — {selectedWeek.replace('-', ' · Season ')}
              </Badge>
            )}
          </Box>

          {/* Stats Overview */}
          <Card bg="linear-gradient(to-r, var(--chakra-colors-brand-50), var(--chakra-colors-accent-50))" shadow="md">
            <CardBody>
              <Text fontWeight="semibold" mb={4} color="brand.800">
                Your Performance — {stats.weekInfo}
              </Text>
              <StatGroup>
                <Stat>
                  <StatLabel>Total Picks</StatLabel>
                  <StatNumber color="brand.600">{stats.totalPicks}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Completed</StatLabel>
                  <StatNumber color="accent.600">{stats.completedPicks}</StatNumber>
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
                  <StatNumber color="accent.600">{stats.doubleDownPicks}</StatNumber>
                </Stat>
              </StatGroup>

              {/* Double Down Requirement Warning */}
              {stats.needsDoubleDown && (
                <Alert status="warning" mt={4} borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Double Down Required! - {stats.weekInfo}</AlertTitle>
                    <AlertDescription>
                      You must select exactly 1 double down game out of your 5 regular season picks. 
                      You currently have {stats.regularSeasonPicks} regular picks with {stats.regularDoubleDowns} double down.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {/* Double Down Status Info */}
              {stats.regularSeasonPicks > 0 && !stats.needsDoubleDown && (
                <Alert status="info" mt={4} borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Double Down Status - {stats.weekInfo}</AlertTitle>
                    <AlertDescription>
                      Regular season picks: {stats.regularSeasonPicks}/5 | Double downs: {stats.regularDoubleDowns}/1
                      {stats.regularSeasonPicks === 5 && stats.regularDoubleDowns === 1 && " ✓ Requirements met!"}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
              
              {stats.completedPicks > 0 && (
                <Box mt={4}>
                  <Text fontSize="sm" mb={2} color={useColorModeValue("neutral.600", "neutral.300")}>Progress to Goal</Text>
                  <Progress 
                    value={stats.winRate} 
                    colorScheme="brand" 
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
                colorScheme="brand"
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
                const canRemove = !gameStarted && !game.completed && selectedWeek === 'current'

                return (
                  <PickCard
                    key={pick.id}
                    pick={pick}
                    game={game}
                    canRemove={canRemove}
                    isRemoving={removingPick === pick.id}
                    onRemove={() => confirmRemovePick(game.id, pick.id, pick.pickedTeam)}
                    getSpreadDisplay={getSpreadDisplay}
                  />
                )
              })}
            </SimpleGrid>
          )}
        </VStack>
        
        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Remove Pick"
          cancelText="Cancel"
          colorScheme="red"
        />
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
  const cardBg = useColorModeValue('rgba(255,255,255,0.75)', 'rgba(255,255,255,0.04)')
  const cardBorderColor = useColorModeValue('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.08)')
  const pickHighlightBg = useColorModeValue('rgba(106,222,156,0.12)', 'rgba(106,222,156,0.08)')
  const pickHighlightBorder = useColorModeValue('brand.200', 'rgba(106,222,156,0.25)')
  const mutedColor = useColorModeValue('neutral.500', 'neutral.400')
  const textColor = useColorModeValue('neutral.800', 'neutral.100')
  const teamLogoPlaceholderBg = useColorModeValue('neutral.200', 'neutral.700')
  const vsDividerColor = useColorModeValue('neutral.200', 'rgba(255,255,255,0.08)')
  const winBg = useColorModeValue('rgba(106,222,156,0.15)', 'rgba(106,222,156,0.1)')
  const lossBg = useColorModeValue('rgba(239,68,68,0.1)', 'rgba(239,68,68,0.1)')
  const pushBg = useColorModeValue('rgba(0,0,0,0.04)', 'rgba(255,255,255,0.04)')

  const getPickResult = () => {
    if (pick.points === null) return null
    if (pick.result) return pick.result
    if (pick.points > 0) return 'win'
    if (pick.points === 0) return 'push'
    return 'loss'
  }

  const pickResult = getPickResult()
  const gameStarted = new Date(game.startTime) <= new Date()

  const showDoubleDown = pick.isDoubleDown && (() => {
    if (game.gameType !== 'BOWL' && game.gameType !== 'PLAYOFF') return true
    const notes = game.notes?.toLowerCase() || ''
    return notes.includes('playoff') || notes.includes('national championship') ||
      notes.includes('semifinal') || notes.includes('rose bowl') ||
      notes.includes('sugar bowl') || notes.includes('orange bowl') ||
      notes.includes('cotton bowl') || notes.includes('fiesta bowl') ||
      notes.includes('peach bowl')
  })()

  const resultAccentColor =
    pickResult === 'win' ? '#6ade9c' :
    pickResult === 'loss' ? '#fc8181' :
    pickResult === 'push' ? '#a3a3a3' :
    'transparent'

  const resultBg = pickResult === 'win' ? winBg : pickResult === 'loss' ? lossBg : pushBg

  const lockedSpreadDisplay = pick.lockedSpread > 0
    ? `${game.awayTeam} -${pick.lockedSpread}`
    : pick.lockedSpread < 0
    ? `${game.homeTeam} -${Math.abs(pick.lockedSpread)}`
    : 'Even'

  return (
    <Card
      bg={cardBg}
      backdropFilter="blur(16px)"
      sx={{
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `inset 4px 0 0 ${resultAccentColor}, 0 4px 20px rgba(0,0,0,0.1)`,
        border: `1px solid ${cardBorderColor}`,
      }}
      overflow="hidden"
      transition="all 0.2s ease"
      _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
    >
      <CardBody p={4}>
        <VStack spacing={3} align="stretch">
          {/* Header row */}
          <HStack justify="space-between" flexWrap="wrap" gap={1}>
            <HStack spacing={2} flexWrap="wrap">
              <Badge
                colorScheme={game.completed ? 'green' : gameStarted ? 'orange' : 'blue'}
                borderRadius="full"
                px={2}
                fontSize="11px"
                fontWeight="700"
                letterSpacing="0.04em"
                textTransform="uppercase"
              >
                {game.completed ? 'Final' : gameStarted ? 'Live' : 'Upcoming'}
              </Badge>
              {showDoubleDown && (
                <Badge
                  colorScheme="orange"
                  variant="solid"
                  borderRadius="full"
                  px={2}
                  fontSize="11px"
                  fontWeight="700"
                >
                  2× DD
                </Badge>
              )}
            </HStack>
            <Text fontSize="xs" color={mutedColor} flexShrink={0}>
              {new Date(game.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              {' · '}
              {new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </HStack>

          {/* Matchup */}
          <VStack spacing={1}>
            {/* Away Team */}
            <HStack
              justify="space-between"
              w="full"
              px={3}
              py={2}
              borderRadius="lg"
              bg={pick.pickedTeam === game.awayTeam ? pickHighlightBg : 'transparent'}
              border="1px solid"
              borderColor={pick.pickedTeam === game.awayTeam ? pickHighlightBorder : 'transparent'}
              transition="all 0.15s ease"
            >
              <HStack spacing={3}>
                {game.awayTeamLogo ? (
                  <Image src={game.awayTeamLogo} alt={game.awayTeam} boxSize="36px" objectFit="contain" flexShrink={0} />
                ) : (
                  <Box w="36px" h="36px" borderRadius="md" bg={teamLogoPlaceholderBg} flexShrink={0} />
                )}
                <VStack align="start" spacing={0}>
                  <Text
                    fontWeight={pick.pickedTeam === game.awayTeam ? '700' : '500'}
                    fontSize="sm"
                    color={pick.pickedTeam === game.awayTeam ? textColor : mutedColor}
                    lineHeight="1.3"
                  >
                    {game.awayTeam}
                  </Text>
                  <Text fontSize="11px" color={mutedColor} letterSpacing="0.06em" textTransform="uppercase">Away</Text>
                </VStack>
              </HStack>
              <HStack spacing={2} align="center">
                {game.awayScore !== null && (
                  <Text fontWeight="800" fontSize="xl" color={textColor} letterSpacing="-0.02em">
                    {game.awayScore}
                  </Text>
                )}
                {pick.pickedTeam === game.awayTeam && (
                  <CheckIcon color="brand.500" boxSize={3} />
                )}
              </HStack>
            </HStack>

            {/* VS Divider */}
            <HStack px={3} spacing={2}>
              <Box flex={1} h="1px" bg={vsDividerColor} />
              <Text fontSize="11px" color={mutedColor} fontWeight="700" letterSpacing="0.1em">VS</Text>
              <Box flex={1} h="1px" bg={vsDividerColor} />
            </HStack>

            {/* Home Team */}
            <HStack
              justify="space-between"
              w="full"
              px={3}
              py={2}
              borderRadius="lg"
              bg={pick.pickedTeam === game.homeTeam ? pickHighlightBg : 'transparent'}
              border="1px solid"
              borderColor={pick.pickedTeam === game.homeTeam ? pickHighlightBorder : 'transparent'}
              transition="all 0.15s ease"
            >
              <HStack spacing={3}>
                {game.homeTeamLogo ? (
                  <Image src={game.homeTeamLogo} alt={game.homeTeam} boxSize="36px" objectFit="contain" flexShrink={0} />
                ) : (
                  <Box w="36px" h="36px" borderRadius="md" bg={teamLogoPlaceholderBg} flexShrink={0} />
                )}
                <VStack align="start" spacing={0}>
                  <Text
                    fontWeight={pick.pickedTeam === game.homeTeam ? '700' : '500'}
                    fontSize="sm"
                    color={pick.pickedTeam === game.homeTeam ? textColor : mutedColor}
                    lineHeight="1.3"
                  >
                    {game.homeTeam}
                  </Text>
                  <Text fontSize="11px" color={mutedColor} letterSpacing="0.06em" textTransform="uppercase">Home</Text>
                </VStack>
              </HStack>
              <HStack spacing={2} align="center">
                {game.homeScore !== null && (
                  <Text fontWeight="800" fontSize="xl" color={textColor} letterSpacing="-0.02em">
                    {game.homeScore}
                  </Text>
                )}
                {pick.pickedTeam === game.homeTeam && (
                  <CheckIcon color="brand.500" boxSize={3} />
                )}
              </HStack>
            </HStack>
          </VStack>

          {/* Spread info */}
          <HStack justify="space-between" px={1} flexWrap="wrap" gap={1}>
            <Text fontSize="xs" color={mutedColor}>
              Spread:{' '}
              <Text as="span" fontWeight="600" color={textColor}>
                {getSpreadDisplay(game)}
              </Text>
            </Text>
            {pick.lockedSpread !== 0 && (
              <Text fontSize="xs" color={mutedColor}>
                Locked:{' '}
                <Text as="span" fontWeight="600" color={textColor}>
                  {lockedSpreadDisplay}
                </Text>
              </Text>
            )}
          </HStack>

          {/* Result block */}
          {pick.points !== null && (
            <Box px={3} py={2} borderRadius="lg" bg={resultBg} textAlign="center">
              <Text
                fontWeight="800"
                fontSize="sm"
                letterSpacing="0.06em"
                textTransform="uppercase"
                color={
                  pick.points > 0 ? 'brand.500' :
                  pickResult === 'push' ? mutedColor :
                  'red.400'
                }
              >
                {pick.points > 0
                  ? `Win  ·  +${pick.points} pts`
                  : pickResult === 'push'
                  ? 'Push  ·  ±0 pts'
                  : `Loss  ·  ${pick.points} pts`}
              </Text>
            </Box>
          )}

          {/* Remove action */}
          {canRemove && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="red"
              leftIcon={<CloseIcon boxSize="9px" />}
              onClick={onRemove}
              isLoading={isRemoving}
              loadingText="Removing..."
              w="full"
              fontSize="xs"
              mt={1}
            >
              Remove Pick
            </Button>
          )}

          {gameStarted && !game.completed && !canRemove && (
            <Text fontSize="xs" color={mutedColor} textAlign="center" letterSpacing="0.02em">
              Game in progress — pick locked
            </Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  )
}