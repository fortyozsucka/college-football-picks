'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Tooltip,
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
} from '@chakra-ui/react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/context/AuthContext'

interface LeaderboardEntry {
  userId: string
  name: string
  email: string
  totalPoints: number
  rank: number
  isUserCut: boolean
  roundTotals?: Record<number, number>
  bonusPoints?: number
  tiebreakerScore: number | null
  tiebreakerRank: number | null
}

interface Tournament {
  id: string
  name: string
  status: string
  season: number
  rounds: { id: string; roundNumber: number; isCompleted: boolean; status: string }[]
}

export default function ChakraGolfLeaderboardPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tournamentId = searchParams.get('tournamentId')

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scoreboard colours — stay close to Augusta green regardless of dark mode
  const boardBg = useColorModeValue('#1a472a', '#0f2d1a')
  const headerBg = useColorModeValue('#f5f0e8', '#e8e0d0')
  const rowBg = useColorModeValue('#ffffff', '#f5f0e8')
  const altRowBg = useColorModeValue('#f0ebe0', '#e8e3d8')
  const highlightBg = '#fffde7'
  const borderCol = useColorModeValue('#2d6a4f', '#1a472a')
  const mutedText = useColorModeValue('gray.600', 'gray.400')

  const fetchLeaderboard = () => {
    if (!tournamentId) return
    setLoading(true)
    fetch(`/api/golf/leaderboard?tournamentId=${tournamentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setTournament(data.tournament)
        setLeaderboard(data.leaderboard ?? [])
      })
      .catch(() => setError('Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLeaderboard() }, [tournamentId])

  useEffect(() => {
    if (tournament?.status !== 'IN_PROGRESS') return
    const interval = setInterval(fetchLeaderboard, 120_000)
    return () => clearInterval(interval)
  }, [tournament?.status])

  const completedRounds = tournament?.rounds.filter((r) => r.isCompleted) ?? []
  const liveRound = tournament?.rounds.find((r) => r.status === 'IN_PROGRESS')
  const hasBonus = leaderboard.some((e) => (e.bonusPoints ?? 0) > 0)

  // Show tiebreaker column only when 2+ users share the same total points
  const pointCounts = new Map<number, number>()
  leaderboard.forEach((e) => pointCounts.set(e.totalPoints, (pointCounts.get(e.totalPoints) ?? 0) + 1))
  const hasTies = Array.from(pointCounts.values()).some((c) => c > 1)
  const showTiebreaker = hasTies && leaderboard.some((e) => e.tiebreakerScore !== null)

  // Auto-redirect to active or most recent tournament if none selected
  useEffect(() => {
    if (tournamentId) return
    fetch('/api/golf/tournaments?season=' + new Date().getFullYear())
      .then((r) => r.json())
      .then((data: { id: string; status: string }[]) => {
        if (!Array.isArray(data)) return
        const target =
          data.find((t) => t.status === 'IN_PROGRESS') ??
          data.find((t) => t.status === 'UPCOMING') ??
          data[data.length - 1]
        if (target) router.replace(`/golf/leaderboard?tournamentId=${target.id}`)
      })
  }, [tournamentId])

  if (!tournamentId) {
    return (
      <ProtectedRoute>
        <Container maxW="4xl" py={6}>
          <Flex justify="center" py={12}><Spinner size="lg" color="green.500" /></Flex>
        </Container>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Container maxW="4xl" py={6}>
        <VStack spacing={5} align="stretch">

          {/* Top bar */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <HStack spacing={3}>
              {tournament && (
                <Badge
                  colorScheme={
                    tournament.status === 'IN_PROGRESS' ? 'green' :
                    tournament.status === 'COMPLETED' ? 'gray' : 'blue'
                  }
                  fontSize="sm" px={2} py={1}
                >
                  {tournament.status === 'IN_PROGRESS' ? '● Live' :
                   tournament.status === 'COMPLETED' ? 'Final' : 'Upcoming'}
                </Badge>
              )}
              {tournament && <Text color={mutedText} fontSize="sm">{tournament.name} · {tournament.season}</Text>}
            </HStack>
            <HStack>
              <Button as={Link} href="/golf" size="sm" variant="outline">All Tournaments</Button>
              <Button as={Link} href={`/golf/field?tournamentId=${tournamentId}`} size="sm" variant="outline">Tournament Field</Button>
              {tournament?.status === 'UPCOMING' && (
                <Button as={Link} href={`/golf/picks?tournamentId=${tournamentId}`} size="sm" colorScheme="green">
                  Make Picks
                </Button>
              )}
              {tournament?.status === 'IN_PROGRESS' && (
                <Button size="sm" variant="ghost" onClick={fetchLeaderboard}>↻ Refresh</Button>
              )}
            </HStack>
          </Flex>

          {/* Round progress pills */}
          {tournament && (
            <HStack spacing={2} wrap="wrap">
              {[1, 2, 3, 4].map((rn) => {
                const round = tournament.rounds.find((r) => r.roundNumber === rn)
                const s = round?.status ?? 'NOT_STARTED'
                return (
                  <Badge
                    key={rn}
                    colorScheme={s === 'COMPLETED' ? 'green' : s === 'IN_PROGRESS' ? 'yellow' : 'gray'}
                    variant={s === 'NOT_STARTED' ? 'outline' : 'solid'}
                    fontSize="xs" px={2} py={1}
                  >
                    RD {rn}{s === 'IN_PROGRESS' ? ' (Live)' : s === 'COMPLETED' ? ' ✓' : ''}
                  </Badge>
                )
              })}
            </HStack>
          )}

          {loading && <Flex justify="center" py={12}><Spinner size="lg" color="green.500" /></Flex>}
          {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}

          {/* ── Augusta Scoreboard ── */}
          {!loading && leaderboard.length > 0 && (
            <Box borderRadius="lg" overflow="hidden" boxShadow="2xl" border="3px solid" borderColor={boardBg}>

              {/* LEADERS header */}
              <Box bg={boardBg} py={3} textAlign="center">
                <Text
                  fontWeight="900"
                  fontSize={{ base: 'xl', md: '2xl' }}
                  letterSpacing="0.2em"
                  color="white"
                  fontFamily="serif"
                >
                  LEADERS
                </Text>
              </Box>

              {/* Table */}
              <TableContainer>
                <Table variant="unstyled" size="sm">
                  <Thead>
                    <Tr bg={headerBg}>
                      <Th
                        w="60px"
                        textAlign="center"
                        fontSize="xs"
                        fontWeight="900"
                        color={boardBg}
                        borderRight="1px solid"
                        borderColor={borderCol}
                        letterSpacing="0.1em"
                        py={3}
                      >
                        POS
                      </Th>
                      <Th
                        fontSize="xs"
                        fontWeight="900"
                        color={boardBg}
                        letterSpacing="0.1em"
                        py={3}
                      >
                        PLAYER
                      </Th>
                      {completedRounds.map((r) => (
                        <Th
                          key={r.id}
                          isNumeric
                          fontSize="xs"
                          fontWeight="900"
                          color={boardBg}
                          letterSpacing="0.1em"
                          py={3}
                        >
                          RD {r.roundNumber}
                        </Th>
                      ))}
                      {liveRound && (
                        <Th isNumeric fontSize="xs" fontWeight="900" color="green.600" letterSpacing="0.1em" py={3}>
                          RD {liveRound.roundNumber}*
                        </Th>
                      )}
                      {hasBonus && (
                        <Th isNumeric fontSize="xs" fontWeight="900" color={boardBg} letterSpacing="0.1em" py={3}>
                          BONUS
                        </Th>
                      )}
                      <Th
                        isNumeric
                        fontSize="xs"
                        fontWeight="900"
                        color={boardBg}
                        letterSpacing="0.1em"
                        py={3}
                        borderLeft="2px solid"
                        borderColor={borderCol}
                      >
                        TOTAL
                      </Th>
                      {showTiebreaker && (
                        <Th isNumeric fontSize="xs" fontWeight="900" color="purple.600" letterSpacing="0.1em" py={3}>
                          TB
                        </Th>
                      )}
                    </Tr>
                  </Thead>

                  <Tbody>
                    {leaderboard.map((entry, i) => {
                      const isCurrentUser = entry.userId === user?.id
                      const bg = isCurrentUser ? highlightBg : i % 2 === 0 ? rowBg : altRowBg

                      return (
                        <Tr
                          key={entry.userId}
                          bg={bg}
                          _hover={{ filter: 'brightness(0.97)' }}
                          transition="filter 0.1s"
                          fontWeight={isCurrentUser ? '700' : '500'}
                        >
                          {/* POS */}
                          <Td
                            textAlign="center"
                            fontWeight="800"
                            fontSize="md"
                            color={boardBg}
                            borderRight="1px solid"
                            borderColor={borderCol}
                            py={3}
                            w="60px"
                          >
                            {entry.isUserCut ? (
                              <Text fontSize="xs" color="red.500" fontWeight="700">CUT</Text>
                            ) : (
                              entry.rank
                            )}
                          </Td>

                          {/* PLAYER */}
                          <Td py={3}>
                            <Text
                              as={Link}
                              href={`/golf/scorecard?tournamentId=${tournamentId}&userId=${entry.userId}`}
                              fontWeight={isCurrentUser ? '800' : '700'}
                              fontSize="sm"
                              letterSpacing="0.05em"
                              color={isCurrentUser ? 'green.700' : 'gray.900'}
                              textTransform="uppercase"
                              _hover={{ textDecoration: 'underline', color: 'green.700' }}
                              cursor="pointer"
                            >
                              {entry.name}
                              {isCurrentUser && (
                                <Text as="span" fontSize="xs" color="green.600" fontWeight="600" ml={1}>
                                  (you)
                                </Text>
                              )}
                            </Text>
                          </Td>

                          {/* Round scores */}
                          {completedRounds.map((r) => (
                            <Td key={r.id} isNumeric fontSize="sm" fontWeight="600" color="gray.800" py={3}>
                              {entry.roundTotals?.[r.roundNumber] ?? 0}
                            </Td>
                          ))}

                          {/* Live round */}
                          {liveRound && (
                            <Td isNumeric fontSize="sm" fontWeight="600" color="green.600" py={3}>
                              {entry.roundTotals?.[liveRound.roundNumber] ?? 0}
                            </Td>
                          )}

                          {/* Bonus */}
                          {hasBonus && (
                            <Td isNumeric fontSize="sm" fontWeight="600" color="gray.800" py={3}>
                              {entry.bonusPoints ?? 0}
                            </Td>
                          )}

                          {/* Total */}
                          <Td
                            isNumeric
                            fontSize="md"
                            fontWeight="800"
                            color={boardBg}
                            borderLeft="2px solid"
                            borderColor={borderCol}
                            py={3}
                          >
                            {entry.totalPoints}
                          </Td>

                          {/* Tiebreaker */}
                          {showTiebreaker && (
                            <Td isNumeric py={3}>
                              {entry.tiebreakerScore !== null ? (
                                <VStack spacing={0} align="flex-end">
                                  <Text fontSize="xs" fontWeight="700" color="purple.600">
                                    {entry.tiebreakerScore > 0 ? `+${entry.tiebreakerScore}` : entry.tiebreakerScore}
                                  </Text>
                                  {entry.tiebreakerRank !== null && (
                                    <Text fontSize="9px" color="purple.400">#{entry.tiebreakerRank}</Text>
                                  )}
                                </VStack>
                              ) : (
                                <Text fontSize="xs" color="gray.400">—</Text>
                              )}
                            </Td>
                          )}
                        </Tr>
                      )
                    })}
                  </Tbody>
                </Table>
              </TableContainer>

              {/* Footer */}
              <Box bg={boardBg} py={1} px={4} textAlign="right">
                <Text fontSize="xs" color="whiteAlpha.600" fontStyle="italic">
                  {liveRound ? `* Round ${liveRound.roundNumber} in progress` : tournament?.status === 'COMPLETED' ? 'Final results' : ''}
                </Text>
              </Box>
            </Box>
          )}

          {!loading && leaderboard.length === 0 && tournament?.status === 'UPCOMING' && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              Picks are hidden until the first tee time Thursday. Submit your picks before the tournament starts!
            </Alert>
          )}

          {!loading && leaderboard.length === 0 && tournament?.status !== 'UPCOMING' && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              No picks submitted yet for this tournament.
            </Alert>
          )}
        </VStack>
      </Container>
    </ProtectedRoute>
  )
}
