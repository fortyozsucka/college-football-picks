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
  Avatar,
} from '@chakra-ui/react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'

interface RoundScore {
  score: number | null
  status: string
  withdrawn: boolean
}

interface FieldEntry {
  golferId: string
  fullName: string
  photoUrl: string | null
  isPicked: boolean
  position: number | null
  totalScore: number | null
  thru: string | null
  missedCut: boolean
  withdrawn: boolean
  rounds: Record<number, RoundScore>
}

interface Tournament {
  id: string
  name: string
  status: string
  season: number
  rounds: { id: string; roundNumber: number; status: string; isCompleted: boolean }[]
}

function formatScore(score: number | null): string {
  if (score === null) return '—'
  if (score === 0) return 'E'
  return score > 0 ? `+${score}` : `${score}`
}

// RoundScore shows raw strokes (65, 70, etc.) — standard golf leaderboard style
function RoundScore({ score }: { score: number | null }) {
  const mutedText = useColorModeValue('gray.400', 'gray.500')
  if (score === null) return <Text color={mutedText} fontSize="sm">—</Text>
  return <Text fontSize="sm" fontWeight="600" color="gray.700">{score}</Text>
}

// TotalScore shows to-par (−8, E, +2) in color
function ScoreText({ score, isTotal = false }: { score: number | null; isTotal?: boolean }) {
  const mutedText = useColorModeValue('gray.400', 'gray.500')
  if (score === null) return <Text color={mutedText} fontSize="sm">—</Text>
  const color = score < 0 ? 'red.500' : score > 0 ? 'blue.600' : 'gray.700'
  return (
    <Text
      fontSize={isTotal ? 'md' : 'sm'}
      fontWeight={isTotal ? '800' : '600'}
      color={color}
    >
      {formatScore(score)}
    </Text>
  )
}

export default function ChakraGolfFieldPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tournamentId = searchParams.get('tournamentId')

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [field, setField] = useState<FieldEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const boardBg = '#1a472a'
  const headerBg = useColorModeValue('#f5f0e8', '#1a2e1a')
  const rowBg = useColorModeValue('#ffffff', '#1a2020')
  const altRowBg = useColorModeValue('#f0ebe0', '#162020')
  const pickedBg = useColorModeValue('#f0fff4', '#1a2e1a')
  const borderCol = useColorModeValue('#2d6a4f', '#1a472a')
  const mutedText = useColorModeValue('gray.500', 'gray.400')

  useEffect(() => {
    if (tournamentId) { fetchField(); return }
    fetch('/api/golf/tournaments?season=' + new Date().getFullYear())
      .then(r => r.json())
      .then((data: { id: string; status: string }[]) => {
        if (!Array.isArray(data)) return
        const t = data.find(t => t.status === 'IN_PROGRESS') ?? data.find(t => t.status === 'UPCOMING') ?? data[data.length - 1]
        if (t) router.replace(`/golf/field?tournamentId=${t.id}`)
      })
  }, [tournamentId])

  const fetchField = () => {
    if (!tournamentId) return
    setLoading(true)
    fetch(`/api/golf/field?tournamentId=${tournamentId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setTournament(data.tournament)
        setField(data.field ?? [])
      })
      .catch(() => setError('Failed to load field'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (tournament?.status !== 'IN_PROGRESS') return
    const interval = setInterval(fetchField, 120_000)
    return () => clearInterval(interval)
  }, [tournament?.status])

  if (!tournamentId) {
    return (
      <ProtectedRoute>
        <Container maxW="4xl" py={6}>
          <Flex justify="center" py={12}><Spinner size="lg" color="green.500" /></Flex>
        </Container>
      </ProtectedRoute>
    )
  }

  const activeRounds = tournament?.rounds.filter(r => r.isCompleted || r.status === 'IN_PROGRESS') ?? []
  const liveRound = tournament?.rounds.find(r => r.status === 'IN_PROGRESS')
  const playing = field.filter(f => !f.missedCut && !f.withdrawn)
  const cut = field.filter(f => f.missedCut && !f.withdrawn)
  const wd = field.filter(f => f.withdrawn)

  return (
    <ProtectedRoute>
      <Container maxW="4xl" py={6}>
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
                Squad Leaderboard
              </Button>
              <Button as={Link} href={`/golf/scorecard?tournamentId=${tournamentId}`} size="sm" variant="outline">
                Scorecard
              </Button>
              {tournament?.status === 'IN_PROGRESS' && (
                <Button size="sm" variant="ghost" onClick={fetchField}>↻ Refresh</Button>
              )}
            </HStack>
          </Flex>

          {loading && <Flex justify="center" py={12}><Spinner size="lg" color="green.500" /></Flex>}
          {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}

          {!loading && field.length === 0 && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              No scores yet — check back once the tournament begins.
            </Alert>
          )}

          {!loading && field.length > 0 && (
            <>
              {/* Legend */}
              <HStack spacing={4} fontSize="xs" color={mutedText}>
                <HStack spacing={1}>
                  <Box w={3} h={3} bg="green.100" borderRadius="sm" border="1px solid" borderColor="green.400" />
                  <Text>= your picks</Text>
                </HStack>
                <Text>Scores shown to-par (red = under, blue = over)</Text>
              </HStack>

              <Box borderRadius="lg" overflow="hidden" boxShadow="2xl" border="3px solid" borderColor={boardBg}>

                {/* Header */}
                <Box bg={boardBg} py={3} textAlign="center">
                  <Text fontWeight="900" fontSize={{ base: 'xl', md: '2xl' }} letterSpacing="0.2em" color="white" fontFamily="serif">
                    TOURNAMENT LEADERBOARD
                  </Text>
                  {tournament && (
                    <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="0.15em" mt={0.5}>
                      {tournament.name.toUpperCase()} · {tournament.season}
                    </Text>
                  )}
                </Box>

                <TableContainer>
                  <Table variant="unstyled" size="sm">
                    <Thead>
                      <Tr bg={headerBg}>
                        <Th w="50px" textAlign="center" fontSize="xs" fontWeight="900" color={boardBg}
                          borderRight="1px solid" borderColor={borderCol} letterSpacing="0.1em" py={3}>
                          POS
                        </Th>
                        <Th fontSize="xs" fontWeight="900" color={boardBg} letterSpacing="0.1em" py={3}>
                          PLAYER
                        </Th>
                        {liveRound && (
                          <Th fontSize="xs" fontWeight="900" color="green.700" letterSpacing="0.1em" py={3} isNumeric>
                            THRU
                          </Th>
                        )}
                        {activeRounds.map(r => (
                          <Th key={r.id} isNumeric fontSize="xs" fontWeight="900" letterSpacing="0.1em" py={3}
                            color={r.status === 'IN_PROGRESS' ? 'green.600' : boardBg}>
                            R{r.roundNumber}{r.status === 'IN_PROGRESS' ? '*' : ''}
                          </Th>
                        ))}
                        <Th isNumeric fontSize="xs" fontWeight="900" color={boardBg} letterSpacing="0.1em" py={3}
                          borderLeft="2px solid" borderColor={borderCol}>
                          TOTAL
                        </Th>
                      </Tr>
                    </Thead>

                    <Tbody>
                      {playing.map((entry, i) => {
                        const bg = entry.isPicked ? pickedBg : i % 2 === 0 ? rowBg : altRowBg
                        const prevPos = i > 0 ? playing[i - 1].position : null
                        const posDisplay = entry.position === prevPos ? 'T' + entry.position : entry.position

                        return (
                          <Tr key={entry.golferId} bg={bg} _hover={{ filter: 'brightness(0.97)' }} transition="filter 0.1s">
                            <Td textAlign="center" fontWeight="800" fontSize="sm" color={boardBg}
                              borderRight="1px solid" borderColor={borderCol} py={2.5} w="50px">
                              {posDisplay}
                            </Td>
                            <Td py={2.5}>
                              <HStack spacing={2}>
                                <Avatar size="xs" name={entry.fullName} src={entry.photoUrl ?? undefined} />
                                <Text
                                  fontWeight={entry.isPicked ? '700' : '500'}
                                  fontSize="sm"
                                  color={entry.isPicked ? 'green.700' : 'gray.900'}
                                >
                                  {entry.fullName}
                                </Text>
                                {entry.isPicked && (
                                  <Badge colorScheme="green" variant="subtle" fontSize="9px">PICKED</Badge>
                                )}
                              </HStack>
                            </Td>
                            {liveRound && (
                              <Td isNumeric py={2.5}>
                                {entry.thru ? (
                                  <Text
                                    fontSize="xs"
                                    fontWeight="600"
                                    color={entry.thru === 'F' ? 'gray.500' : /AM|PM/.test(entry.thru) ? 'purple.500' : 'green.600'}
                                  >
                                    {entry.thru}
                                  </Text>
                                ) : (
                                  <Text fontSize="xs" color={mutedText}>—</Text>
                                )}
                              </Td>
                            )}
                            {activeRounds.map(r => {
                              const rd = entry.rounds[r.roundNumber]
                              return (
                                <Td key={r.id} isNumeric py={2.5}>
                                  {rd?.withdrawn
                                    ? <Text fontSize="xs" color="orange.500" fontWeight="700">WD</Text>
                                    : <RoundScore score={rd?.score ?? null} />}
                                </Td>
                              )
                            })}
                            <Td isNumeric py={2.5} borderLeft="2px solid" borderColor={borderCol}>
                              <ScoreText score={entry.totalScore} isTotal />
                            </Td>
                          </Tr>
                        )
                      })}

                      {/* MC separator */}
                      {cut.length > 0 && (
                        <Tr>
                          <Td colSpan={3 + activeRounds.length + (liveRound ? 1 : 0)} py={1} bg={headerBg}>
                            <Text fontSize="xs" fontWeight="700" color={mutedText} textAlign="center" letterSpacing="0.15em">
                              — MISSED CUT —
                            </Text>
                          </Td>
                        </Tr>
                      )}

                      {cut.map((entry, i) => (
                        <Tr key={entry.golferId} bg={i % 2 === 0 ? rowBg : altRowBg} opacity={0.55}>
                          <Td textAlign="center" fontSize="xs" color="red.400" fontWeight="700"
                            borderRight="1px solid" borderColor={borderCol} py={2}>
                            MC
                          </Td>
                          <Td py={2}>
                            <HStack spacing={2}>
                              <Avatar size="xs" name={entry.fullName} src={entry.photoUrl ?? undefined} />
                              <Text fontSize="sm" color="gray.500">{entry.fullName}</Text>
                              {entry.isPicked && (
                                <Badge colorScheme="red" variant="subtle" fontSize="9px">PICKED</Badge>
                              )}
                            </HStack>
                          </Td>
                          {activeRounds.map(r => (
                            <Td key={r.id} isNumeric py={2}>
                              <RoundScore score={entry.rounds[r.roundNumber]?.score ?? null} />
                            </Td>
                          ))}
                          <Td isNumeric py={2} borderLeft="2px solid" borderColor={borderCol}>
                            <ScoreText score={entry.totalScore} isTotal />
                          </Td>
                        </Tr>
                      ))}

                      {/* WD separator */}
                      {wd.length > 0 && (
                        <Tr>
                          <Td colSpan={3 + activeRounds.length + (liveRound ? 1 : 0)} py={1} bg={headerBg}>
                            <Text fontSize="xs" fontWeight="700" color={mutedText} textAlign="center" letterSpacing="0.15em">
                              — WITHDRAWN —
                            </Text>
                          </Td>
                        </Tr>
                      )}

                      {wd.map((entry, i) => (
                        <Tr key={entry.golferId} bg={i % 2 === 0 ? rowBg : altRowBg} opacity={0.45}>
                          <Td textAlign="center" fontSize="xs" color="orange.400" fontWeight="700"
                            borderRight="1px solid" borderColor={borderCol} py={2}>
                            WD
                          </Td>
                          <Td py={2}>
                            <HStack spacing={2}>
                              <Avatar size="xs" name={entry.fullName} src={entry.photoUrl ?? undefined} />
                              <Text fontSize="sm" color="gray.500">{entry.fullName}</Text>
                              {entry.isPicked && (
                                <Badge colorScheme="orange" variant="subtle" fontSize="9px">PICKED</Badge>
                              )}
                            </HStack>
                          </Td>
                          {activeRounds.map(r => {
                            const rd = entry.rounds[r.roundNumber]
                            return (
                              <Td key={r.id} isNumeric py={2}>
                                {rd?.withdrawn
                                  ? <Text fontSize="xs" color="orange.400" fontWeight="700">WD</Text>
                                  : <RoundScore score={rd?.score ?? null} />}
                              </Td>
                            )
                          })}
                          <Td isNumeric py={2} borderLeft="2px solid" borderColor={borderCol}>
                            <ScoreText score={entry.totalScore} isTotal />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>

                <Box bg={boardBg} py={1} px={4} textAlign="right">
                  <Text fontSize="xs" color="whiteAlpha.600" fontStyle="italic">
                    {liveRound ? `* Round ${liveRound.roundNumber} in progress` : tournament?.status === 'COMPLETED' ? 'Final results' : ''}
                  </Text>
                </Box>
              </Box>
            </>
          )}
        </VStack>
      </Container>
    </ProtectedRoute>
  )
}
