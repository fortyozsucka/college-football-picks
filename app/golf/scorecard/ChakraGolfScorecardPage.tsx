'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Flex,
  Button,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Divider,
} from '@chakra-ui/react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/context/AuthContext'

interface RoundEntry {
  roundNumber: number
  roundStatus: string
  score: number | null
  roundToPar: number | null
  position: number | null
  missedCut: boolean
  withdrawn: boolean
  points: number | null
}

interface GolferEntry {
  golferId: string
  fullName: string
  group: string
  isUserCut: boolean
  rounds: RoundEntry[]
  total: number
}

interface UserScorecard {
  userId: string
  name: string
  isUserCut: boolean
  totalPoints: number
  golfers: GolferEntry[]
}

interface Tournament {
  id: string
  name: string
  status: string
  season: number
  rounds: { id: string; roundNumber: number; status: string; isCompleted: boolean }[]
}

const GROUP_COLORS: Record<string, string> = { A: 'green', B: 'yellow', C: 'orange' }

function formatScore(score: number | null): string {
  if (score === null) return '—'
  if (score === 0) return 'E'
  return score > 0 ? `+${score}` : `${score}`
}

function formatToPar(n: number): string {
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

// Round scores: raw strokes with to-par in parens, e.g. "68 (-4)"
function ScoreCell({ score, roundToPar, missedCut, withdrawn }: { score: number | null; roundToPar: number | null; missedCut: boolean; withdrawn: boolean }) {
  const mutedText = useColorModeValue('gray.400', 'gray.500')
  if (withdrawn) return <Text fontSize="xs" color="orange.400" fontWeight="600">WD</Text>
  if (missedCut) return <Text fontSize="xs" color="red.400" fontWeight="600">MC</Text>
  if (score === null) return <Text color={mutedText}>—</Text>
  const toParColor = roundToPar !== null ? (roundToPar < 0 ? 'red.500' : roundToPar > 0 ? 'blue.600' : 'gray.500') : 'gray.500'
  return (
    <Text fontSize="sm" fontWeight="600" color="gray.700">
      {score}
      {roundToPar !== null && (
        <Text as="span" fontSize="xs" fontWeight="500" color={toParColor} ml={1}>
          ({formatToPar(roundToPar)})
        </Text>
      )}
    </Text>
  )
}

export default function ChakraGolfScorecardPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tournamentId = searchParams.get('tournamentId')
  const focusUserId = searchParams.get('userId')

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [scorecards, setScorecards] = useState<UserScorecard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cardBg = useColorModeValue('white', 'gray.800')
  const headerBg = useColorModeValue('gray.50', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedText = useColorModeValue('gray.500', 'gray.400')
  const boardBg = '#1a472a'

  useEffect(() => {
    if (tournamentId) { fetchScorecard(); return }
    // Auto-redirect to active/upcoming tournament
    fetch('/api/golf/tournaments?season=' + new Date().getFullYear())
      .then(r => r.json())
      .then((data: { id: string; status: string }[]) => {
        if (!Array.isArray(data)) return
        const t = data.find(t => t.status === 'IN_PROGRESS') ?? data.find(t => t.status === 'UPCOMING') ?? data[data.length - 1]
        if (t) router.replace(`/golf/scorecard?tournamentId=${t.id}`)
      })
  }, [tournamentId])

  const fetchScorecard = () => {
    if (!tournamentId) return
    setLoading(true)
    fetch(`/api/golf/scorecard?tournamentId=${tournamentId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setTournament(data.tournament)
        setScorecards(data.scorecards ?? [])
      })
      .catch(() => setError('Failed to load scorecard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (tournament?.status !== 'IN_PROGRESS') return
    const interval = setInterval(fetchScorecard, 120_000)
    return () => clearInterval(interval)
  }, [tournament?.status])

  if (!tournamentId) {
    return (
      <ProtectedRoute>
        <Container maxW="5xl" py={6}>
          <Flex justify="center" py={12}><Spinner size="lg" color="green.500" /></Flex>
        </Container>
      </ProtectedRoute>
    )
  }

  const activeRounds = tournament?.rounds.filter(r => r.isCompleted || r.status === 'IN_PROGRESS') ?? []
  const liveRound = tournament?.rounds.find(r => r.status === 'IN_PROGRESS')

  // If focusUserId given, show that card first; otherwise show current user first
  const sortedScorecards = focusUserId
    ? [...scorecards].sort((a, b) => a.userId === focusUserId ? -1 : b.userId === focusUserId ? 1 : 0)
    : [...scorecards].sort((a, b) => a.userId === user?.id ? -1 : b.userId === user?.id ? 1 : 0)

  return (
    <ProtectedRoute>
      <Container maxW="5xl" py={6}>
        <VStack spacing={5} align="stretch">

          {/* Top bar */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <HStack spacing={3}>
              {tournament && (
                <Badge
                  colorScheme={tournament.status === 'IN_PROGRESS' ? 'green' : tournament.status === 'COMPLETED' ? 'gray' : 'blue'}
                  fontSize="sm" px={2} py={1}
                >
                  {tournament.status === 'IN_PROGRESS' ? '● Live' : tournament.status === 'COMPLETED' ? 'Final' : 'Upcoming'}
                </Badge>
              )}
              {tournament && <Text color={mutedText} fontSize="sm">{tournament.name} · {tournament.season}</Text>}
            </HStack>
            <HStack>
              <Button as={Link} href={`/golf/leaderboard?tournamentId=${tournamentId}`} size="sm" variant="outline">
                ← Leaderboard
              </Button>
              {tournament?.status === 'IN_PROGRESS' && (
                <Button size="sm" variant="ghost" onClick={fetchScorecard}>↻ Refresh</Button>
              )}
            </HStack>
          </Flex>

          {loading && <Flex justify="center" py={12}><Spinner size="lg" color="green.500" /></Flex>}
          {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}

          {!loading && scorecards.length === 0 && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              No picks submitted yet for this tournament.
            </Alert>
          )}

          {/* One card per user */}
          {!loading && sortedScorecards.map((card, cardIdx) => {
            const isMe = card.userId === user?.id
            return (
              <Box
                key={card.userId}
                borderRadius="lg"
                overflow="hidden"
                boxShadow={isMe ? '0 0 0 2px #2d6a4f, 0 4px 24px rgba(0,0,0,0.12)' : 'md'}
                border="1px solid"
                borderColor={isMe ? '#2d6a4f' : borderColor}
              >
                {/* User header */}
                <Box bg={boardBg} px={4} py={3}>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Text
                        fontWeight="800"
                        fontSize="md"
                        color="white"
                        letterSpacing="0.05em"
                        textTransform="uppercase"
                      >
                        {card.name}
                        {isMe && (
                          <Text as="span" fontSize="xs" color="green.300" ml={2} fontWeight="600">(you)</Text>
                        )}
                      </Text>
                      {card.isUserCut && (
                        <Badge colorScheme="red" variant="solid" fontSize="xs">CUT</Badge>
                      )}
                    </HStack>
                    <HStack spacing={3}>
                      <Text color="whiteAlpha.700" fontSize="xs" textTransform="uppercase" letterSpacing="0.1em">
                        Total
                      </Text>
                      <Text fontWeight="900" fontSize="xl" color="white">{card.totalPoints}</Text>
                    </HStack>
                  </Flex>
                </Box>

                {/* Golfer table */}
                <Box bg={cardBg}>
                  <TableContainer>
                    <Table variant="unstyled" size="sm">
                      <Thead>
                        <Tr bg={headerBg}>
                          <Th fontSize="xs" color={boardBg} fontWeight="800" letterSpacing="0.08em" py={2}>GOLFER</Th>
                          <Th fontSize="xs" color={boardBg} fontWeight="800" letterSpacing="0.08em" py={2}>GRP</Th>
                          {activeRounds.map(r => (
                            <Th
                              key={r.id}
                              isNumeric
                              fontSize="xs"
                              fontWeight="800"
                              letterSpacing="0.08em"
                              py={2}
                              color={r.status === 'IN_PROGRESS' ? 'green.600' : boardBg}
                            >
                              RD {r.roundNumber}{r.status === 'IN_PROGRESS' ? '*' : ''}
                              <Text fontSize="9px" fontWeight="500" display="block" opacity={0.7}>score / pts</Text>
                            </Th>
                          ))}
                          <Th
                            isNumeric
                            fontSize="xs"
                            fontWeight="800"
                            color={boardBg}
                            letterSpacing="0.08em"
                            py={2}
                            borderLeft="2px solid"
                            borderColor="#2d6a4f"
                          >
                            TOTAL
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {card.golfers.map((g, gi) => {
                          const rowBg = gi % 2 === 0 ? cardBg : useColorModeValue('#f9f9f9', 'gray.750')
                          return (
                            <Tr key={g.golferId} bg={rowBg} opacity={g.rounds.some(r => r.missedCut) ? 0.6 : 1}>
                              <Td py={2.5}>
                                <Text fontSize="sm" fontWeight="600">{g.fullName}</Text>
                              </Td>
                              <Td py={2.5}>
                                <Badge colorScheme={GROUP_COLORS[g.group]} variant="subtle" fontSize="xs">
                                  {g.group}
                                </Badge>
                              </Td>
                              {activeRounds.map(round => {
                                const rd = g.rounds.find(r => r.roundNumber === round.roundNumber)
                                const isLive = round.status === 'IN_PROGRESS'
                                return (
                                  <Td key={round.id} isNumeric py={2.5}>
                                    <VStack spacing={0} align="flex-end">
                                      <ScoreCell score={rd?.score ?? null} roundToPar={rd?.roundToPar ?? null} missedCut={rd?.missedCut ?? false} withdrawn={rd?.withdrawn ?? false} />
                                      {rd?.points !== null && rd?.points !== undefined && (
                                        <Text
                                          fontSize="xs"
                                          fontWeight="700"
                                          color={isLive ? 'green.500' : rd.points > 0 ? boardBg : mutedText}
                                        >
                                          {rd.points}pt{rd.points !== 1 ? 's' : ''}
                                        </Text>
                                      )}
                                    </VStack>
                                  </Td>
                                )
                              })}
                              <Td
                                isNumeric
                                py={2.5}
                                fontWeight="800"
                                fontSize="md"
                                color={boardBg}
                                borderLeft="2px solid"
                                borderColor="#2d6a4f"
                              >
                                {g.total}
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Footer: round subtotals */}
                {activeRounds.length > 0 && (
                  <Box bg={headerBg} px={4} py={2} borderTop="1px solid" borderColor={borderColor}>
                    <Flex justify="flex-end" gap={6}>
                      {activeRounds.map(round => {
                        const roundTotal = card.golfers.reduce((sum, g) => {
                          const rd = g.rounds.find(r => r.roundNumber === round.roundNumber)
                          return sum + (rd?.points ?? 0)
                        }, 0)
                        return (
                          <HStack key={round.id} spacing={1}>
                            <Text fontSize="xs" color={mutedText}>
                              RD {round.roundNumber}{round.status === 'IN_PROGRESS' ? '*' : ''}:
                            </Text>
                            <Text fontSize="xs" fontWeight="700" color={boardBg}>{roundTotal}pts</Text>
                          </HStack>
                        )
                      })}
                      <Divider orientation="vertical" h="16px" />
                      <HStack spacing={1}>
                        <Text fontSize="xs" color={mutedText}>Total:</Text>
                        <Text fontSize="xs" fontWeight="800" color={boardBg}>{card.totalPoints}pts</Text>
                      </HStack>
                    </Flex>
                  </Box>
                )}
              </Box>
            )
          })}

          {liveRound && (
            <Text fontSize="xs" color={mutedText} textAlign="center">
              * Round {liveRound.roundNumber} in progress · auto-refreshes every 2 min
            </Text>
          )}
        </VStack>
      </Container>
    </ProtectedRoute>
  )
}
