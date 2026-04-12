'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Text,
  VStack,
  HStack,
  Badge,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react'
import ProtectedRoute from '@/components/ProtectedRoute'

interface AppResult {
  season: number
  tournamentName: string
  tournamentType: string
  winner: string
  totalPoints: number
  totalUsers: number
  entryFee: number | null
  pot: number | null
}

// ─── Static historical data ───────────────────────────────────────────────────

const STANDINGS = [
  { name: 'Travis',   masters: 1, usOpen: 1, theOpen: 2, pga: 3, players: 0, total: 7, mc: 1 },
  { name: 'Ken',      masters: 2, usOpen: 0, theOpen: 2, pga: 0, players: 0, total: 4, mc: 1 },
  { name: 'James',    masters: 2, usOpen: 1, theOpen: 1, pga: 0, players: 0, total: 4, mc: 2 },
  { name: 'Andy',     masters: 1, usOpen: 1, theOpen: 1, pga: 1, players: 0, total: 4, mc: 2 },
  { name: 'Tony Sr.', masters: 1, usOpen: 1, theOpen: 0, pga: 2, players: 0, total: 4, mc: 1 },
  { name: 'Mike',     masters: 1, usOpen: 1, theOpen: 1, pga: 0, players: 2, total: 4 /*wait*/, mc: 2 },
  { name: 'Phil',     masters: 1, usOpen: 2, theOpen: 0, pga: 0, players: 0, total: 3, mc: 1 },
  { name: 'Tony',     masters: 0, usOpen: 0, theOpen: 2, pga: 0, players: 1, total: 3, mc: 2 },
  { name: 'Sammarco', masters: 0, usOpen: 0, theOpen: 1, pga: 0, players: 0, total: 1, mc: 2 },
  { name: 'Mark',     masters: 0, usOpen: 0, theOpen: 0, pga: 1, players: 0, total: 1, mc: 1 },
  { name: 'Tom',      masters: 0, usOpen: 1, theOpen: 0, pga: 0, players: 0, total: 1, mc: 1 },
  { name: 'Ferrell',  masters: 0, usOpen: 0, theOpen: 0, pga: 0, players: 0, total: 0, mc: 2 },
  { name: 'Sean',     masters: 0, usOpen: 0, theOpen: 0, pga: 0, players: 0, total: 0, mc: 1 },
  { name: 'Pipkin',   masters: 0, usOpen: 0, theOpen: 0, pga: 0, players: 0, total: 0, mc: 0 },
  { name: 'JP',       masters: 0, usOpen: 0, theOpen: 0, pga: 0, players: 0, total: 0, mc: 0 },
].map(p => ({ ...p, total: p.masters + p.usOpen + p.theOpen + p.pga + p.players }))
 .sort((a, b) => b.total - a.total || a.mc - b.mc)

const WINS: { year: number; masters?: string; usOpen?: string; theOpen?: string; pga?: string; players?: string }[] = [
  { year: 2015, masters: 'n/a',      usOpen: 'n/a',      theOpen: 'James',    pga: 'Mark' },
  { year: 2016, masters: 'Ken',      usOpen: 'Phil',     theOpen: 'Tony' },
  { year: 2017, masters: 'Tony Sr.', usOpen: 'Phil',     theOpen: 'Travis',   pga: 'Joe' },
  { year: 2018, masters: 'Ken',      usOpen: 'Joe',      theOpen: 'Tony',     pga: 'Andy' },
  { year: 2019, masters: 'James',    usOpen: 'Travis',   theOpen: 'Ken',      pga: 'Travis' },
  { year: 2020, masters: 'James',    usOpen: 'Mike',     theOpen: 'N/A',      pga: 'Joe' },
  { year: 2021, masters: 'Andy',     usOpen: 'Tony Sr.', theOpen: 'Travis',   pga: 'Tony Sr.' },
  { year: 2022, masters: 'Phil',     usOpen: 'Andy',     theOpen: 'Ken',      pga: 'Travis' },
  { year: 2023, masters: 'Travis',   usOpen: 'James',    theOpen: 'Andy',     pga: 'Sean',     players: 'Mike' },
  { year: 2024, masters: 'Mike',     usOpen: 'Tom',      theOpen: 'Sammarco', pga: 'Travis',   players: 'Tony' },
  { year: 2025, masters: 'Pipkin',   usOpen: 'Tony Sr.', theOpen: 'Mike',     pga: 'Tony Sr.', players: 'Mike' },
]

const MISSED_CUTS: { year: number; masters?: string; usOpen?: string; theOpen?: string; pga?: string; players?: string }[] = [
  { year: 2021, masters: 'n/a',       usOpen: 'Ferrell',        theOpen: 'Ken / Mark',    pga: 'Phil / Andy' },
  { year: 2022, masters: 'James',     usOpen: 'Mike',           theOpen: 'Sammarco',      pga: 'Tony Sr.' },
  { year: 2023, masters: 'James',     usOpen: 'Tony',           theOpen: 'Tony',          pga: 'Mike',          players: 'Ken' },
  { year: 2024, masters: 'Sammarco',  usOpen: 'Sean',           theOpen: '—',             pga: 'James',         players: 'Tom' },
  { year: 2025, masters: 'Andy',      usOpen: 'Andy / Sammarco',theOpen: 'Pipkin',        pga: 'Travis',        players: 'Sean' },
]

// ─── Component ────────────────────────────────────────────────────────────────

const GREEN = '#1a472a'
const LIGHT_GREEN = '#2d6a4f'

function WinCell({ value }: { value: string | undefined }) {
  const mutedText = useColorModeValue('gray.400', 'gray.500')
  if (!value) return <Text color={mutedText} fontSize="sm">—</Text>
  if (value === 'n/a' || value === 'N/A') return <Text color={mutedText} fontSize="sm" fontStyle="italic">n/a</Text>
  return <Text fontSize="sm" fontWeight="600">{value}</Text>
}

function StatCell({ value }: { value: number }) {
  const mutedText = useColorModeValue('gray.400', 'gray.500')
  if (value === 0) return <Text color={mutedText} fontSize="sm">—</Text>
  return <Text fontSize="sm" fontWeight="700" color={LIGHT_GREEN}>{value}</Text>
}

// Map tournament name → wins column key
function tournamentToKey(name: string): 'masters' | 'usOpen' | 'theOpen' | 'pga' | 'players' | null {
  const n = name.toLowerCase()
  if (n.includes('masters')) return 'masters'
  if (n.includes('u.s. open') || n.includes('us open')) return 'usOpen'
  if (n.includes('open championship') || n.includes('the open')) return 'theOpen'
  if (n.includes('pga championship')) return 'pga'
  if (n.includes('players')) return 'players'
  return null
}

export default function ChakraGolfHistoryPage() {
  const [appResults, setAppResults] = useState<AppResult[]>([])
  const [loadingResults, setLoadingResults] = useState(true)

  const cardBg = useColorModeValue('white', 'gray.800')
  const headerBg = useColorModeValue('gray.50', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedText = useColorModeValue('gray.500', 'gray.400')
  const sectionHeadBg = useColorModeValue('gray.100', 'gray.700')

  useEffect(() => {
    fetch('/api/golf/history')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAppResults(data) })
      .catch(() => {})
      .finally(() => setLoadingResults(false))
  }, [])

  // Merge app results into standings
  type StandingKey = 'masters' | 'usOpen' | 'theOpen' | 'pga' | 'players'
  const mergedStandings = [...STANDINGS.map(p => ({ ...p }))]
  for (const result of appResults) {
    const key = tournamentToKey(result.tournamentName)
    if (!key) continue
    let player = mergedStandings.find(p => p.name.toLowerCase() === result.winner.toLowerCase())
    if (!player) {
      player = { name: result.winner, masters: 0, usOpen: 0, theOpen: 0, pga: 0, players: 0, total: 0, mc: 0 }
      mergedStandings.push(player)
    }
    player[key as StandingKey] = (player[key as StandingKey] ?? 0) + 1
    player.total = player.masters + player.usOpen + player.theOpen + player.pga + player.players
  }
  mergedStandings.sort((a, b) => b.total - a.total || a.mc - b.mc)

  // Merge app results into wins table (group by year)
  const appWinsByYear = new Map<number, Partial<typeof WINS[0]>>()
  for (const result of appResults) {
    if (!appWinsByYear.has(result.season)) appWinsByYear.set(result.season, { year: result.season })
    const key = tournamentToKey(result.tournamentName)
    if (key) (appWinsByYear.get(result.season) as any)[key] = result.winner
  }
  const appWinRows = Array.from(appWinsByYear.values()).sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
  // Only show years not already in static WINS
  const staticYears = new Set(WINS.map(w => w.year))
  const newWinRows = appWinRows.filter(r => !staticYears.has(r.year ?? 0)) as typeof WINS

  return (
    <ProtectedRoute>
      <Container maxW="6xl" py={6}>
        <VStack spacing={8} align="stretch">

          {/* Page header */}
          <Box bg={GREEN} borderRadius="lg" px={6} py={5} textAlign="center">
            <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="0.2em" textTransform="uppercase" mb={1}>
              Squad Golf
            </Text>
            <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="900" color="white" letterSpacing="0.05em">
              All-Time History
            </Text>
            <Text fontSize="sm" color="whiteAlpha.700" mt={1}>2015 – Present · The Majors</Text>
          </Box>

          {/* ── All-Time Standings ── */}
          <Box borderRadius="lg" overflow="hidden" boxShadow="md" border="1px solid" borderColor={borderColor}>
            <Box bg={GREEN} px={5} py={3}>
              <Text fontWeight="800" fontSize="sm" color="white" letterSpacing="0.12em" textTransform="uppercase">
                All-Time Standings
              </Text>
            </Box>
            <TableContainer>
              <Table variant="unstyled" size="sm">
                <Thead>
                  <Tr bg={sectionHeadBg}>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" letterSpacing="0.08em">PLAYER</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric>MASTERS</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric>US OPEN</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric>THE OPEN</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric>PGA</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric>PLAYERS</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric borderLeft="2px solid" borderColor={LIGHT_GREEN}>TOTAL</Th>
                    <Th py={2} fontSize="xs" color="red.600" fontWeight="800" isNumeric>MC</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {mergedStandings.map((p, i) => {
                    const rowBg = i % 2 === 0 ? cardBg : useColorModeValue('#f9f9f9', 'gray.750')
                    const isTop = p.total > 0
                    return (
                      <Tr key={p.name} bg={rowBg} opacity={isTop ? 1 : 0.6}>
                        <Td py={2.5}>
                          <HStack spacing={2}>
                            {p.total >= 4 && (
                              <Text fontSize="xs">🏆</Text>
                            )}
                            <Text fontSize="sm" fontWeight={p.total > 0 ? '700' : '500'}>{p.name}</Text>
                          </HStack>
                        </Td>
                        <Td isNumeric py={2.5}><StatCell value={p.masters} /></Td>
                        <Td isNumeric py={2.5}><StatCell value={p.usOpen} /></Td>
                        <Td isNumeric py={2.5}><StatCell value={p.theOpen} /></Td>
                        <Td isNumeric py={2.5}><StatCell value={p.pga} /></Td>
                        <Td isNumeric py={2.5}><StatCell value={p.players} /></Td>
                        <Td
                          isNumeric
                          py={2.5}
                          fontWeight="900"
                          fontSize="md"
                          color={p.total > 0 ? GREEN : mutedText}
                          borderLeft="2px solid"
                          borderColor={LIGHT_GREEN}
                        >
                          {p.total || '—'}
                        </Td>
                        <Td isNumeric py={2.5}>
                          {p.mc > 0 ? (
                            <Text fontSize="sm" fontWeight="600" color="red.400">{p.mc}</Text>
                          ) : (
                            <Text color={mutedText} fontSize="sm">—</Text>
                          )}
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>

          {/* ── Year-by-Year Wins ── */}
          <Box borderRadius="lg" overflow="hidden" boxShadow="md" border="1px solid" borderColor={borderColor}>
            <Box bg={GREEN} px={5} py={3}>
              <Text fontWeight="800" fontSize="sm" color="white" letterSpacing="0.12em" textTransform="uppercase">
                Winners by Year
              </Text>
            </Box>
            <TableContainer>
              <Table variant="unstyled" size="sm">
                <Thead>
                  <Tr bg={sectionHeadBg}>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" letterSpacing="0.08em">YEAR</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">MASTERS</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">US OPEN</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">THE OPEN</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">PGA CHAMP.</Th>
                    <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">PLAYERS</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {[...WINS, ...newWinRows].map((row, i) => {
                    const rowBg = i % 2 === 0 ? cardBg : useColorModeValue('#f9f9f9', 'gray.750')
                    const isAppTracked = !staticYears.has(row.year ?? 0)
                    return (
                      <Tr key={row.year} bg={rowBg}>
                        <Td py={2.5} fontWeight="800" color={GREEN} fontSize="sm">
                          {row.year}
                          {isAppTracked && <Badge ml={1} colorScheme="green" fontSize="9px">APP</Badge>}
                        </Td>
                        <Td py={2.5}><WinCell value={row.masters} /></Td>
                        <Td py={2.5}><WinCell value={row.usOpen} /></Td>
                        <Td py={2.5}><WinCell value={row.theOpen} /></Td>
                        <Td py={2.5}><WinCell value={row.pga} /></Td>
                        <Td py={2.5}><WinCell value={row.players} /></Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>

          {/* ── App Results & Cash Prizes ── */}
          {appResults.some(r => r.pot != null) && (
            <Box borderRadius="lg" overflow="hidden" boxShadow="md" border="1px solid" borderColor={borderColor}>
              <Box bg={LIGHT_GREEN} px={5} py={3}>
                <Text fontWeight="800" fontSize="sm" color="white" letterSpacing="0.12em" textTransform="uppercase">
                  Cash Prizes
                </Text>
              </Box>
              <TableContainer>
                <Table variant="unstyled" size="sm">
                  <Thead>
                    <Tr bg={sectionHeadBg}>
                      <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">YEAR</Th>
                      <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">TOURNAMENT</Th>
                      <Th py={2} fontSize="xs" color={GREEN} fontWeight="800">WINNER</Th>
                      <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric>PLAYERS</Th>
                      <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric>ENTRY FEE</Th>
                      <Th py={2} fontSize="xs" color={GREEN} fontWeight="800" isNumeric borderLeft="2px solid" borderColor={LIGHT_GREEN}>PRIZE</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[...appResults].reverse().map((r, i) => {
                      const rowBg = i % 2 === 0 ? cardBg : useColorModeValue('#f9f9f9', 'gray.750')
                      return (
                        <Tr key={`${r.season}-${r.tournamentName}`} bg={rowBg}>
                          <Td py={2.5} fontWeight="700" fontSize="sm" color={GREEN}>{r.season}</Td>
                          <Td py={2.5} fontSize="sm">{r.tournamentName}</Td>
                          <Td py={2.5} fontSize="sm" fontWeight="600">{r.winner}</Td>
                          <Td py={2.5} fontSize="sm" isNumeric>{r.totalUsers}</Td>
                          <Td py={2.5} fontSize="sm" isNumeric color={mutedText}>
                            {r.entryFee != null ? `$${r.entryFee}` : '—'}
                          </Td>
                          <Td py={2.5} fontWeight="800" fontSize="sm" color="green.600" isNumeric borderLeft="2px solid" borderColor={LIGHT_GREEN}>
                            {r.pot != null ? `$${r.pot.toFixed(0)}` : '—'}
                          </Td>
                        </Tr>
                      )
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Missed Cuts by Year ── */}
          <Box borderRadius="lg" overflow="hidden" boxShadow="md" border="1px solid" borderColor={borderColor}>
            <Box bg="red.800" px={5} py={3}>
              <Text fontWeight="800" fontSize="sm" color="white" letterSpacing="0.12em" textTransform="uppercase">
                Missed Cuts by Year
              </Text>
            </Box>
            <TableContainer>
              <Table variant="unstyled" size="sm">
                <Thead>
                  <Tr bg={sectionHeadBg}>
                    <Th py={2} fontSize="xs" color="red.700" fontWeight="800" letterSpacing="0.08em">YEAR</Th>
                    <Th py={2} fontSize="xs" color="red.700" fontWeight="800">MASTERS</Th>
                    <Th py={2} fontSize="xs" color="red.700" fontWeight="800">US OPEN</Th>
                    <Th py={2} fontSize="xs" color="red.700" fontWeight="800">THE OPEN</Th>
                    <Th py={2} fontSize="xs" color="red.700" fontWeight="800">PGA CHAMP.</Th>
                    <Th py={2} fontSize="xs" color="red.700" fontWeight="800">PLAYERS</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {MISSED_CUTS.map((row, i) => {
                    const rowBg = i % 2 === 0 ? cardBg : useColorModeValue('#f9f9f9', 'gray.750')
                    return (
                      <Tr key={row.year} bg={rowBg}>
                        <Td py={2.5} fontWeight="800" color="red.700" fontSize="sm">{row.year}</Td>
                        <Td py={2.5}><WinCell value={row.masters} /></Td>
                        <Td py={2.5}><WinCell value={row.usOpen} /></Td>
                        <Td py={2.5}><WinCell value={row.theOpen} /></Td>
                        <Td py={2.5}><WinCell value={row.pga} /></Td>
                        <Td py={2.5}><WinCell value={row.players} /></Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </TableContainer>
            <Box bg={headerBg} px={5} py={2} borderTop="1px solid" borderColor={borderColor}>
              <Text fontSize="xs" color={mutedText}>
                Missed cut tracking began in 2021 · Players Championship added in 2023
              </Text>
            </Box>
          </Box>

        </VStack>
      </Container>
    </ProtectedRoute>
  )
}
