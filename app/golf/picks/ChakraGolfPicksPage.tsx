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
  Button,
  Badge,
  Card,
  CardBody,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  Flex,
  Avatar,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
  useToast,
  Divider,
  Tooltip,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react'
import { CheckIcon } from '@chakra-ui/icons'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/context/AuthContext'

interface GolferOdds {
  id: string
  odds: number
  group: 'A' | 'B' | 'C'
  golfer: {
    id: string
    espnId: string
    fullName: string
    photoUrl: string | null
  }
}

interface GroupedOdds {
  A: GolferOdds[]
  B: GolferOdds[]
  C: GolferOdds[]
}

interface Tournament {
  id: string
  name: string
  startDate: string
  status: string
}

interface Selection {
  golferId: string
  group: 'A' | 'B' | 'C'
  fullName: string
}

const GROUP_LABELS: Record<string, string> = {
  A: 'Group A — Favorites (< +6000)',
  B: 'Group B — Mid-tier (+6000 to +20000)',
  C: 'Group C — Longshots (> +20000)',
}

const GROUP_COLORS: Record<string, string> = {
  A: 'green',
  B: 'yellow',
  C: 'orange',
}

export default function ChakraGolfPicksPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const tournamentId = searchParams.get('tournamentId')

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [odds, setOdds] = useState<GroupedOdds>({ A: [], B: [], C: [] })
  const [selections, setSelections] = useState<Selection[]>([])
  const [tiebreaker, setTiebreaker] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingPicks, setExistingPicks] = useState(false)
  const [allPicks, setAllPicks] = useState<any[]>([])

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const selectedBg = useColorModeValue('green.50', 'green.900')
  const selectedBorder = useColorModeValue('green.400', 'green.500')
  const mutedText = useColorModeValue('gray.600', 'gray.400')
  const titleGradient = useColorModeValue(
    'linear(to-r, neutral.900, brand.600)',
    'linear(to-r, neutral.100, brand.400)'
  )

  useEffect(() => {
    if (!tournamentId || !user) return

    Promise.all([
      fetch(`/api/golf/tournaments/${tournamentId}`).then((r) => r.json()),
      fetch(`/api/golf/odds?tournamentId=${tournamentId}`).then((r) => r.json()),
      fetch(`/api/golf/picks?userId=${user.id}&tournamentId=${tournamentId}`).then((r) => r.json()),
    ])
      .then(([t, o, p]) => {
        setTournament(t)
        if (o.A) setOdds(o)
        if (Array.isArray(p) && p.length > 0) {
          setExistingPicks(true)
          setSelections(
            p.map((pick: any) => ({
              golferId: pick.golferId,
              group: pick.golferGroup,
              fullName: pick.golfer.fullName,
            }))
          )
          // If tournament is locked, also load all users' picks
          if (t?.status !== 'UPCOMING') {
            fetch(`/api/golf/picks?tournamentId=${tournamentId}`)
              .then(r => r.json())
              .then(all => { if (Array.isArray(all)) setAllPicks(all) })
          }
        }
      })
      .catch(() => setError('Failed to load picks data'))
      .finally(() => setLoading(false))
  }, [tournamentId, user])

  const selectionsForGroup = (group: 'A' | 'B' | 'C') =>
    selections.filter((s) => s.group === group)

  const isSelected = (golferId: string) => selections.some((s) => s.golferId === golferId)

  const toggleGolfer = (golfer: GolferOdds) => {
    if (tournament?.status !== 'UPCOMING') return

    if (isSelected(golfer.golfer.id)) {
      setSelections((prev) => prev.filter((s) => s.golferId !== golfer.golfer.id))
      return
    }

    if (selectionsForGroup(golfer.group).length >= 2) {
      toast({
        title: `Group ${golfer.group} full`,
        description: 'You can only pick 2 golfers from each group.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      })
      return
    }

    setSelections((prev) => [
      ...prev,
      { golferId: golfer.golfer.id, group: golfer.group, fullName: golfer.golfer.fullName },
    ])
  }

  const canSubmit =
    selectionsForGroup('A').length === 2 &&
    selectionsForGroup('B').length === 2 &&
    selectionsForGroup('C').length === 2 &&
    tiebreaker !== ''

  const handleSubmit = async () => {
    if (!user || !tournamentId || !canSubmit) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/golf/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tournamentId,
          golfers: selections.map((s) => ({ golferId: s.golferId, group: s.group })),
          tiebreakerScore: tiebreaker !== '' ? parseInt(tiebreaker) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: data.error ?? 'Failed to submit picks', status: 'error', duration: 4000, isClosable: true })
        return
      }

      toast({ title: 'Picks submitted!', status: 'success', duration: 3000, isClosable: true })
      router.push(`/golf/leaderboard?tournamentId=${tournamentId}`)
    } catch {
      toast({ title: 'Network error. Please try again.', status: 'error', duration: 4000, isClosable: true })
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-redirect to active or next upcoming tournament if none selected
  useEffect(() => {
    if (tournamentId) return
    fetch('/api/golf/tournaments?season=' + new Date().getFullYear())
      .then((r) => r.json())
      .then((data: { id: string; status: string }[]) => {
        if (!Array.isArray(data)) return
        const active = data.find((t) => t.status === 'IN_PROGRESS') ?? data.find((t) => t.status === 'UPCOMING')
        if (active) router.replace(`/golf/picks?tournamentId=${active.id}`)
      })
  }, [tournamentId])

  if (!tournamentId) {
    return (
      <ProtectedRoute>
        <Container maxW="3xl" py={6}>
          <Flex justify="center" py={12}><Spinner size="lg" color="green.500" /></Flex>
        </Container>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Container maxW="4xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="xl" bgGradient={titleGradient} bgClip="text" mb={1}>
              ⛳ Make Your Picks
            </Heading>
            {tournament && (
              <Text color={mutedText}>{tournament?.name} · Pick 2 from each group</Text>
            )}
          </Box>

          {loading && <Flex justify="center" py={12}><Spinner size="lg" /></Flex>}
          {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}

          {tournament?.status !== 'UPCOMING' && !loading && (() => {
            // Group picks by user
            const byUser = new Map<string, { name: string; userId: string; picks: any[] }>()
            for (const pick of allPicks) {
              const uid = pick.userId
              if (!byUser.has(uid)) {
                byUser.set(uid, {
                  userId: uid,
                  name: pick.user?.name || pick.user?.email?.split('@')[0] || 'Unknown',
                  picks: [],
                })
              }
              byUser.get(uid)!.picks.push(pick)
            }
            const users = Array.from(byUser.values())
            const GREEN = '#1a472a'
            const LIGHT_GREEN = '#2d6a4f'

            return (
              <VStack spacing={4} align="stretch">
                <Box bg={GREEN} borderRadius="lg" px={5} py={4}>
                  <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                    <Box>
                      <Text fontWeight="800" fontSize="lg" color="white" letterSpacing="0.05em">
                        {tournament?.name} — Pick Summary
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.700" mt={0.5}>
                        Picks locked · {users.length} {users.length === 1 ? 'entry' : 'entries'}
                      </Text>
                    </Box>
                    <Badge
                      colorScheme={tournament?.status === 'IN_PROGRESS' ? 'green' : 'gray'}
                      fontSize="sm" px={2} py={1}
                    >
                      {tournament?.status === 'IN_PROGRESS' ? '● Live' : 'Final'}
                    </Badge>
                  </Flex>
                </Box>

                {users.length === 0 && (
                  <Alert status="info" borderRadius="md"><AlertIcon />No picks submitted for this tournament.</Alert>
                )}

                {users.map(({ userId: uid, name, picks }) => {
                  const isMe = uid === user?.id
                  const byGroup: Record<string, any[]> = { A: [], B: [], C: [] }
                  for (const p of picks) byGroup[p.golferGroup]?.push(p)

                  return (
                    <Box
                      key={uid}
                      borderRadius="lg"
                      overflow="hidden"
                      border="1px solid"
                      borderColor={isMe ? LIGHT_GREEN : borderColor}
                      boxShadow={isMe ? `0 0 0 2px ${LIGHT_GREEN}` : 'sm'}
                    >
                      <Box bg={GREEN} px={4} py={2.5}>
                        <Text fontWeight="800" fontSize="sm" color="white" letterSpacing="0.08em" textTransform="uppercase">
                          {name}
                          {isMe && <Text as="span" fontSize="xs" color="green.300" ml={2}>(you)</Text>}
                        </Text>
                      </Box>
                      <Box bg={cardBg}>
                        <TableContainer>
                          <Table variant="unstyled" size="sm">
                            <Thead>
                              <Tr bg={useColorModeValue('gray.50', 'gray.700')}>
                                {(['A', 'B', 'C'] as const).map(g => (
                                  <Th key={g} py={2} fontSize="xs" color={GREEN} fontWeight="800">
                                    <Badge colorScheme={GROUP_COLORS[g]} variant="subtle" mr={1}>{g}</Badge>
                                    {g === 'A' ? 'Favorites' : g === 'B' ? 'Mid-tier' : 'Longshots'}
                                  </Th>
                                ))}
                              </Tr>
                            </Thead>
                            <Tbody>
                              <Tr>
                                {(['A', 'B', 'C'] as const).map(g => (
                                  <Td key={g} py={3} verticalAlign="top">
                                    <VStack align="start" spacing={2}>
                                      {byGroup[g].map((p: any) => (
                                        <HStack key={p.id} spacing={2}>
                                          <Avatar size="xs" name={p.golfer.fullName} src={p.golfer.photoUrl ?? undefined} />
                                          <Text fontSize="sm" fontWeight="600">{p.golfer.fullName}</Text>
                                        </HStack>
                                      ))}
                                      {byGroup[g].length === 0 && (
                                        <Text fontSize="xs" color={mutedText}>—</Text>
                                      )}
                                    </VStack>
                                  </Td>
                                ))}
                              </Tr>
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Box>
                  )
                })}
              </VStack>
            )
          })()}

          {tournament?.status !== 'UPCOMING' && !loading && null}

          {existingPicks && tournament?.status === 'UPCOMING' && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              You already have picks for this tournament. Submitting will replace them.
            </Alert>
          )}

          {/* Selection Summary */}
          {!loading && tournament?.status === 'UPCOMING' && (
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <HStack justify="space-between" wrap="wrap" gap={2}>
                  {(['A', 'B', 'C'] as const).map((group) => (
                    <VStack key={group} spacing={0} align="center" flex={1}>
                      <Badge colorScheme={GROUP_COLORS[group]} mb={1}>Group {group}</Badge>
                      <Text fontSize="xl" fontWeight="bold">{selectionsForGroup(group).length}/2</Text>
                      <Text fontSize="xs" color={mutedText}>
                        {selectionsForGroup(group).map((s) => s.fullName.split(' ').pop()).join(', ') || 'None'}
                      </Text>
                    </VStack>
                  ))}
                </HStack>
              </CardBody>
            </Card>
          )}

          {/* Golfer Groups */}
          {!loading && tournament?.status === 'UPCOMING' && (['A', 'B', 'C'] as const).map((group) => (
            <Box key={group}>
              <HStack mb={3}>
                <Badge colorScheme={GROUP_COLORS[group]} fontSize="sm" px={2} py={1}>
                  Group {group}
                </Badge>
                <Text fontSize="sm" color={mutedText}>{GROUP_LABELS[group]}</Text>
                <Badge variant="outline">{selectionsForGroup(group).length}/2 selected</Badge>
              </HStack>

              <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
                {odds[group].map((g) => {
                  const selected = isSelected(g.golfer.id)
                  const groupFull = selectionsForGroup(group).length >= 2 && !selected

                  return (
                    <Card
                      key={g.id}
                      bg={selected ? selectedBg : cardBg}
                      border="1px"
                      borderColor={selected ? selectedBorder : borderColor}
                      cursor={tournament?.status === 'UPCOMING' ? (groupFull ? 'not-allowed' : 'pointer') : 'default'}
                      opacity={groupFull ? 0.5 : 1}
                      onClick={() => toggleGolfer(g)}
                      _hover={tournament?.status === 'UPCOMING' && !groupFull ? { shadow: 'md' } : {}}
                      transition="all 0.15s"
                    >
                      <CardBody py={3} px={4}>
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Avatar
                              size="sm"
                              name={g.golfer.fullName}
                              src={g.golfer.photoUrl ?? undefined}
                            />
                            <Box>
                              <Text fontWeight="500" fontSize="sm" lineHeight="tight">{g.golfer.fullName}</Text>
                              <Text fontSize="xs" color={mutedText}>+{g.odds.toLocaleString()}</Text>
                            </Box>
                          </HStack>
                          {selected && <Icon as={CheckIcon} color="green.500" boxSize={4} />}
                        </HStack>
                      </CardBody>
                    </Card>
                  )
                })}

                {odds[group].length === 0 && (
                  <Text color={mutedText} fontSize="sm" py={2}>No golfers assigned to this group yet.</Text>
                )}
              </SimpleGrid>
            </Box>
          ))}

          {/* Tiebreaker */}
          {!loading && tournament?.status === 'UPCOMING' && (
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <VStack align="stretch" spacing={2}>
                  <Text fontWeight="600">Tiebreaker <Text as="span" color="red.500">*</Text></Text>
                  <Text fontSize="sm" color={mutedText}>
                    Predict the winner's final score (relative to par). Required to submit — closest without going over wins ties.
                  </Text>
                  <HStack>
                    <NumberInput
                      value={tiebreaker}
                      onChange={(val) => setTiebreaker(val)}
                      min={-30}
                      max={10}
                      w="140px"
                    >
                      <NumberInputField placeholder="e.g. -12" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text fontSize="sm" color={mutedText}>to par</Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Submit */}
          {!loading && tournament?.status === 'UPCOMING' && (
            <Tooltip
              label={!canSubmit ? 'Pick 2 golfers from each group and enter a tiebreaker score to continue' : ''}
              isDisabled={canSubmit}
            >
              <Button
                colorScheme="green"
                size="lg"
                isDisabled={!canSubmit}
                isLoading={submitting}
                loadingText="Submitting..."
                onClick={handleSubmit}
              >
                Submit Picks
              </Button>
            </Tooltip>
          )}
        </VStack>
      </Container>
    </ProtectedRoute>
  )
}
