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
  Spinner,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  Flex,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/context/AuthContext'

interface Tournament {
  id: string
  name: string
  tournamentType: string
  startDate: string
  endDate: string
  season: number
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED'
  _count: { golfPicks: number }
}

const STATUS_COLORS: Record<string, string> = {
  UPCOMING: 'blue',
  IN_PROGRESS: 'green',
  COMPLETED: 'gray',
}

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Upcoming',
  IN_PROGRESS: 'Live',
  COMPLETED: 'Final',
}

// Returns true when the tournament is UPCOMING and within 3 days of starting (Mon–Wed pick window)
function isPickWindow(tournament: Tournament): boolean {
  if (tournament.status !== 'UPCOMING') return false
  const daysUntilStart = (new Date(tournament.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return daysUntilStart <= 3
}

export default function ChakraGolfPage() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedText = useColorModeValue('gray.600', 'gray.400')
  const titleGradient = useColorModeValue(
    'linear(to-r, neutral.900, brand.600)',
    'linear(to-r, neutral.100, brand.400)'
  )

  useEffect(() => {
    fetch(`/api/golf/tournaments?season=${new Date().getFullYear()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTournaments(data)
        else setError('Failed to load tournaments')
      })
      .catch(() => setError('Failed to load tournaments'))
      .finally(() => setLoading(false))
  }, [])

  const active = tournaments.find((t) => t.status === 'IN_PROGRESS')
  const upcoming = tournaments.filter((t) => t.status === 'UPCOMING')
  const completed = tournaments.filter((t) => t.status === 'COMPLETED')

  return (
    <ProtectedRoute>
      <Container maxW="4xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading
              size="xl"
              bgGradient={titleGradient}
              bgClip="text"
              mb={1}
            >
              ⛳ Squad Golf
            </Heading>
            <Text color={mutedText} fontSize="sm">
              Masters · PGA Championship · US Open · The Open · The Players
            </Text>
          </Box>

          {!user?.playGolf && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              You're not enrolled in the golf league yet. Ask an admin to enable access.
            </Alert>
          )}

          {loading && (
            <Flex justify="center" py={12}>
              <Spinner size="lg" />
            </Flex>
          )}

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Active Tournament */}
          {active && (
            <Box>
              <Text fontWeight="600" fontSize="sm" color={mutedText} mb={2} textTransform="uppercase" letterSpacing="wide">
                Live Now
              </Text>
              <TournamentCard tournament={active} cardBg={cardBg} borderColor={borderColor} mutedText={mutedText} />
            </Box>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <Box>
              <Text fontWeight="600" fontSize="sm" color={mutedText} mb={2} textTransform="uppercase" letterSpacing="wide">
                Upcoming
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {upcoming.map((t) => (
                  <TournamentCard key={t.id} tournament={t} cardBg={cardBg} borderColor={borderColor} mutedText={mutedText} />
                ))}
              </SimpleGrid>
            </Box>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <Box>
              <Text fontWeight="600" fontSize="sm" color={mutedText} mb={2} textTransform="uppercase" letterSpacing="wide">
                Completed
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {completed.map((t) => (
                  <TournamentCard key={t.id} tournament={t} cardBg={cardBg} borderColor={borderColor} mutedText={mutedText} />
                ))}
              </SimpleGrid>
            </Box>
          )}

          {!loading && tournaments.length === 0 && !error && (
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Text color={mutedText} textAlign="center" py={6}>
                  No tournaments scheduled yet for {new Date().getFullYear()}.
                </Text>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    </ProtectedRoute>
  )
}

function TournamentCard({
  tournament,
  cardBg,
  borderColor,
  mutedText,
}: {
  tournament: Tournament
  cardBg: string
  borderColor: string
  mutedText: string
}) {
  const start = new Date(tournament.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const end = new Date(tournament.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <Card bg={cardBg} border="1px" borderColor={borderColor} _hover={{ shadow: 'md' }} transition="box-shadow 0.2s">
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Badge
              colorScheme={isPickWindow(tournament) ? 'purple' : STATUS_COLORS[tournament.status]}
              variant="subtle"
            >
              {isPickWindow(tournament) ? 'Make Your Picks' : STATUS_LABELS[tournament.status]}
            </Badge>
            <Badge variant="outline" colorScheme="purple" fontSize="xs">
              {tournament.tournamentType === 'PLAYERS' ? "THE PLAYERS" : "MAJOR"}
            </Badge>
          </HStack>

          <Box>
            <Heading size="sm" mb={1}>{tournament.name}</Heading>
            <Text fontSize="xs" color={mutedText}>{start} – {end}</Text>
          </Box>

          <HStack>
            <Stat size="sm">
              <StatLabel fontSize="xs">Entries</StatLabel>
              <StatNumber fontSize="md">{Math.floor(tournament._count.golfPicks / 6)}</StatNumber>
            </Stat>
          </HStack>

          <HStack spacing={2} pt={1}>
            {tournament.status === 'UPCOMING' && (
              <Button as={Link} href={`/golf/picks?tournamentId=${tournament.id}`} size="sm" colorScheme="green" flex={1}>
                Make Picks
              </Button>
            )}
            <Button as={Link} href={`/golf/leaderboard?tournamentId=${tournament.id}`} size="sm" variant="outline" flex={1}>
              Leaderboard
            </Button>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  )
}
