'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  Flex,
  Switch,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Heading,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react'
import { RepeatIcon, AddIcon } from '@chakra-ui/icons'

interface GolfUser {
  id: string
  name: string | null
  email: string
  playGolf: boolean
  playFootball: boolean
}

interface Tournament {
  id: string
  espnId: string
  name: string
  status: string
  season: number
  startDate: string
  _count: { golfPicks: number }
}

export default function GolfAdminPanel() {
  const toast = useToast()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedText = useColorModeValue('gray.600', 'gray.400')

  // ── Users ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<GolfUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [togglingUser, setTogglingUser] = useState<string | null>(null)

  // ── Tournaments ────────────────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [tournamentsLoading, setTournamentsLoading] = useState(true)
  const [newTournament, setNewTournament] = useState({
    espnId: '', name: '', startDate: '', endDate: '', season: new Date().getFullYear().toString(),
  })
  const [creatingTournament, setCreatingTournament] = useState(false)

  // ── Odds ───────────────────────────────────────────────────────────────────
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [oddsJson, setOddsJson] = useState('')
  const [settingOdds, setSettingOdds] = useState(false)
  const [importingOdds, setImportingOdds] = useState(false)
  const [oddsImportResult, setOddsImportResult] = useState<any>(null)

  // ── Sync ───────────────────────────────────────────────────────────────────
  const [syncTournamentId, setSyncTournamentId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  useEffect(() => {
    fetchUsers()
    fetchTournaments()
  }, [])

  // ── User functions ─────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/golf')
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    } catch {
      toast({ title: 'Failed to load users', status: 'error', duration: 3000 })
    } finally {
      setUsersLoading(false)
    }
  }

  const toggleFootball = async (userId: string, currentValue: boolean) => {
    setTogglingUser(userId)
    try {
      const res = await fetch('/api/admin/golf', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, playFootball: !currentValue }),
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, playFootball: updated.playFootball } : u)))
      toast({
        title: `Football ${updated.playFootball ? 'enabled' : 'disabled'} for ${updated.name ?? updated.email}`,
        status: 'success',
        duration: 2000,
      })
    } catch (e: any) {
      toast({ title: e.message ?? 'Failed to update', status: 'error', duration: 3000 })
    } finally {
      setTogglingUser(null)
    }
  }

  const toggleGolf = async (userId: string, currentValue: boolean) => {
    setTogglingUser(userId)
    try {
      const res = await fetch('/api/admin/golf', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, playGolf: !currentValue }),
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, playGolf: updated.playGolf } : u)))
      toast({
        title: `Golf ${updated.playGolf ? 'enabled' : 'disabled'} for ${updated.name ?? updated.email}`,
        status: 'success',
        duration: 2000,
      })
    } catch (e: any) {
      toast({ title: e.message ?? 'Failed to update', status: 'error', duration: 3000 })
    } finally {
      setTogglingUser(null)
    }
  }

  const [importing, setImporting] = useState(false)

  // ── Tournament functions ───────────────────────────────────────────────────

  const fetchTournaments = async () => {
    setTournamentsLoading(true)
    try {
      const res = await fetch(`/api/golf/tournaments?season=${new Date().getFullYear()}`)
      const data = await res.json()
      if (Array.isArray(data)) setTournaments(data)
    } catch {
      toast({ title: 'Failed to load tournaments', status: 'error', duration: 3000 })
    } finally {
      setTournamentsLoading(false)
    }
  }

  const importFromESPN = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/golf/tournaments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season: newTournament.season }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: data.error ?? 'Import failed',
          description: data.allEvents ? `ESPN events found: ${data.allEvents.join(', ')}` : undefined,
          status: 'error',
          duration: 6000,
          isClosable: true,
        })
        return
      }

      const parts = []
      if (data.imported.length) parts.push(`Imported: ${data.imported.join(', ')}`)
      if (data.updated.length) parts.push(`Status updated: ${data.updated.join(', ')}`)
      if (data.skipped.length) parts.push(`No change: ${data.skipped.join(', ')}`)
      if (data.errors.length) parts.push(`Errors: ${data.errors.join(', ')}`)

      toast({
        title: `ESPN import complete — ${data.imported.length} added, ${data.updated?.length ?? 0} updated`,
        description: parts.join(' · ') || undefined,
        status: data.imported.length > 0 || data.updated?.length > 0 ? 'success' : 'info',
        duration: 6000,
        isClosable: true,
      })
      fetchTournaments()
    } catch {
      toast({ title: 'Import failed', status: 'error', duration: 3000 })
    } finally {
      setImporting(false)
    }
  }

  const createTournament = async () => {
    if (!newTournament.espnId || !newTournament.name || !newTournament.startDate) {
      toast({ title: 'ESPN ID, name, and start date are required', status: 'warning', duration: 3000 })
      return
    }
    setCreatingTournament(true)
    try {
      const res = await fetch('/api/golf/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTournament, season: parseInt(newTournament.season) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: `${data.name} created`, status: 'success', duration: 3000 })
      setNewTournament({ espnId: '', name: '', startDate: '', endDate: '', season: new Date().getFullYear().toString() })
      fetchTournaments()
    } catch (e: any) {
      toast({ title: e.message ?? 'Failed to create', status: 'error', duration: 4000 })
    } finally {
      setCreatingTournament(false)
    }
  }

  const updateTournamentStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/golf/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast({ title: 'Status updated', status: 'success', duration: 2000 })
      fetchTournaments()
    } catch {
      toast({ title: 'Failed to update status', status: 'error', duration: 3000 })
    }
  }

  // ── Odds functions ─────────────────────────────────────────────────────────

  const submitOdds = async () => {
    if (!selectedTournamentId || !oddsJson.trim()) {
      toast({ title: 'Select a tournament and enter golfer data', status: 'warning', duration: 3000 })
      return
    }

    let golfers: any[]
    try {
      golfers = JSON.parse(oddsJson)
      if (!Array.isArray(golfers)) throw new Error('Must be an array')
    } catch {
      toast({ title: 'Invalid JSON — must be an array of golfer objects', status: 'error', duration: 4000 })
      return
    }

    setSettingOdds(true)
    try {
      const res = await fetch('/api/golf/odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: selectedTournamentId, golfers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: `${data.count} golfers saved`, status: 'success', duration: 3000 })
      setOddsJson('')
    } catch (e: any) {
      toast({ title: e.message ?? 'Failed to set odds', status: 'error', duration: 4000 })
    } finally {
      setSettingOdds(false)
    }
  }

  const importOddsFromApi = async () => {
    if (!selectedTournamentId) {
      toast({ title: 'Select a tournament first', status: 'warning', duration: 3000 })
      return
    }
    setImportingOdds(true)
    setOddsImportResult(null)
    try {
      const res = await fetch('/api/golf/odds/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: selectedTournamentId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: data.noKey ? 'Not supported' : 'Import failed',
          description: data.error,
          status: data.noKey ? 'warning' : 'error',
          duration: 6000,
          isClosable: true,
        })
        return
      }

      setOddsImportResult(data)
      toast({
        title: `Imported odds for ${data.count} golfers`,
        description: data.created > 0 ? `${data.created} new golfers created` : undefined,
        status: 'success',
        duration: 4000,
        isClosable: true,
      })
    } catch {
      toast({ title: 'Import failed', status: 'error', duration: 3000 })
    } finally {
      setImportingOdds(false)
    }
  }

  // ── Sync functions ─────────────────────────────────────────────────────────

  const triggerSync = async () => {
    if (!syncTournamentId) {
      toast({ title: 'Select a tournament to sync', status: 'warning', duration: 3000 })
      return
    }
    setSyncing(true)
    setSyncResult(null)
    try {
      // Use the single-tournament sync endpoint for manual admin triggers
      const res = await fetch('/api/golf/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: syncTournamentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSyncResult(data)
      toast({ title: `Synced ${data.playersSync} players`, status: 'success', duration: 3000 })
      fetchTournaments()
    } catch (e: any) {
      toast({ title: e.message ?? 'Sync failed', status: 'error', duration: 4000 })
    } finally {
      setSyncing(false)
    }
  }

  const triggerCronSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/cron/golf-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSyncResult({ results: data.results, playersSync: data.results?.reduce((s: number, r: any) => s + (r.playersSync ?? 0), 0) })
      toast({ title: 'Cron sync completed', status: 'success', duration: 3000 })
      fetchTournaments()
    } catch (e: any) {
      toast({ title: e.message ?? 'Cron sync failed', status: 'error', duration: 4000 })
    } finally {
      setSyncing(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const STATUS_COLORS: Record<string, string> = { UPCOMING: 'blue', IN_PROGRESS: 'green', COMPLETED: 'gray' }

  return (
    <VStack spacing={6} align="stretch">
      <Tabs variant="soft-rounded" colorScheme="green" size="sm">
        <TabList mb={4} flexWrap="wrap" gap={2}>
          <Tab>👥 Users</Tab>
          <Tab>🏆 Tournaments</Tab>
          <Tab>📊 Odds / Groups</Tab>
          <Tab>🔄 Sync</Tab>
        </TabList>

        <TabPanels>
          {/* ── Users ── */}
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="600">Squad Golf Enrollment</Text>
                <Button size="xs" leftIcon={<RepeatIcon />} onClick={fetchUsers} isLoading={usersLoading} variant="ghost">
                  Refresh
                </Button>
              </HStack>

              {usersLoading ? (
                <Flex justify="center" py={8}><Spinner /></Flex>
              ) : (
                <Card bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardBody p={0}>
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>User</Th>
                            <Th isNumeric>Football</Th>
                            <Th isNumeric>Golf</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {users.map((u) => (
                            <Tr key={u.id}>
                              <Td>
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="500">{u.name ?? '—'}</Text>
                                  <Text fontSize="xs" color={mutedText}>{u.email}</Text>
                                </VStack>
                              </Td>
                              <Td isNumeric>
                                <Switch
                                  isChecked={u.playFootball}
                                  isDisabled={togglingUser === u.id}
                                  colorScheme="blue"
                                  onChange={() => toggleFootball(u.id, u.playFootball)}
                                />
                              </Td>
                              <Td isNumeric>
                                <Switch
                                  isChecked={u.playGolf}
                                  isDisabled={togglingUser === u.id}
                                  colorScheme="green"
                                  onChange={() => toggleGolf(u.id, u.playGolf)}
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </TabPanel>

          {/* ── Tournaments ── */}
          <TabPanel px={0}>
            <VStack spacing={6} align="stretch">
              {/* Import from ESPN */}
              <Card bg={cardBg} border="1px" borderColor={borderColor}>
                <CardBody>
                  <HStack justify="space-between" wrap="wrap" gap={3}>
                    <Box>
                      <Text fontWeight="600">Import from ESPN</Text>
                      <Text fontSize="sm" color={mutedText}>
                        Auto-imports all Majors + The Players Championship for the selected season.
                        Skips any that already exist.
                      </Text>
                    </Box>
                    <HStack spacing={2}>
                      <Input
                        size="sm"
                        type="number"
                        w="90px"
                        value={newTournament.season}
                        onChange={(e) => setNewTournament((p) => ({ ...p, season: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        colorScheme="green"
                        leftIcon={<AddIcon />}
                        isLoading={importing}
                        loadingText="Importing..."
                        onClick={importFromESPN}
                      >
                        Import
                      </Button>
                    </HStack>
                  </HStack>
                </CardBody>
              </Card>

              <Divider />

              {/* Create manually */}
              <Box>
                <Text fontWeight="600" mb={3}>Create Tournament Manually</Text>
                <Card bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">ESPN Event ID</FormLabel>
                        <Input
                          size="sm"
                          placeholder="e.g. 401353226"
                          value={newTournament.espnId}
                          onChange={(e) => setNewTournament((p) => ({ ...p, espnId: e.target.value }))}
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">Tournament Name</FormLabel>
                        <Input
                          size="sm"
                          placeholder="The Masters"
                          value={newTournament.name}
                          onChange={(e) => setNewTournament((p) => ({ ...p, name: e.target.value }))}
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">Start Date</FormLabel>
                        <Input
                          size="sm"
                          type="date"
                          value={newTournament.startDate}
                          onChange={(e) => setNewTournament((p) => ({ ...p, startDate: e.target.value }))}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">End Date</FormLabel>
                        <Input
                          size="sm"
                          type="date"
                          value={newTournament.endDate}
                          onChange={(e) => setNewTournament((p) => ({ ...p, endDate: e.target.value }))}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">Season</FormLabel>
                        <Input
                          size="sm"
                          type="number"
                          value={newTournament.season}
                          onChange={(e) => setNewTournament((p) => ({ ...p, season: e.target.value }))}
                        />
                      </FormControl>
                    </SimpleGrid>
                    <Button
                      mt={4}
                      size="sm"
                      colorScheme="green"
                      leftIcon={<AddIcon />}
                      isLoading={creatingTournament}
                      onClick={createTournament}
                    >
                      Create Tournament
                    </Button>
                  </CardBody>
                </Card>
              </Box>

              <Divider />

              {/* List */}
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="600">Current Season Tournaments</Text>
                  <Button size="xs" leftIcon={<RepeatIcon />} onClick={fetchTournaments} isLoading={tournamentsLoading} variant="ghost">
                    Refresh
                  </Button>
                </HStack>

                {tournamentsLoading ? (
                  <Flex justify="center" py={8}><Spinner /></Flex>
                ) : tournaments.length === 0 ? (
                  <Text color={mutedText} fontSize="sm">No tournaments yet.</Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {tournaments.map((t) => (
                      <Card key={t.id} bg={cardBg} border="1px" borderColor={borderColor}>
                        <CardBody py={3}>
                          <HStack justify="space-between" wrap="wrap" gap={2}>
                            <HStack spacing={3}>
                              <Badge colorScheme={STATUS_COLORS[t.status]}>{t.status}</Badge>
                              <Box>
                                <Text fontWeight="500" fontSize="sm">{t.name}</Text>
                                <Text fontSize="xs" color={mutedText}>
                                  ESPN ID: {t.espnId} · {Math.floor(t._count.golfPicks / 6)} entries
                                </Text>
                              </Box>
                            </HStack>
                            <HStack spacing={2}>
                              {t.status === 'UPCOMING' && (
                                <Button size="xs" colorScheme="green" onClick={() => updateTournamentStatus(t.id, 'IN_PROGRESS')}>
                                  → In Progress
                                </Button>
                              )}
                              {t.status === 'IN_PROGRESS' && (
                                <>
                                  <Button size="xs" colorScheme="orange" variant="outline" onClick={() => updateTournamentStatus(t.id, 'UPCOMING')}>
                                    ← Reset
                                  </Button>
                                  <Button size="xs" colorScheme="gray" onClick={() => updateTournamentStatus(t.id, 'COMPLETED')}>
                                    → Complete
                                  </Button>
                                </>
                              )}
                            </HStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          </TabPanel>

          {/* ── Odds ── */}
          <TabPanel px={0}>
            <VStack spacing={5} align="stretch">
              <Text fontWeight="600">Set Golfer Odds & Groups</Text>
              <Text fontSize="sm" color={mutedText}>
                Groups are auto-assigned by odds: A (&lt;+6000), B (+6000–+20000), C (&gt;+20000).
              </Text>

              <FormControl>
                <FormLabel fontSize="sm">Tournament</FormLabel>
                <Select
                  size="sm"
                  placeholder="Select tournament"
                  value={selectedTournamentId}
                  onChange={(e) => { setSelectedTournamentId(e.target.value); setOddsImportResult(null) }}
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                  ))}
                </Select>
              </FormControl>

              {/* Auto-import from Odds API */}
              <Card bg={cardBg} border="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between" align="flex-start">
                      <Box>
                        <Text fontWeight="600" fontSize="sm">Import from The Odds API</Text>
                        <Text fontSize="xs" color={mutedText}>
                          Supported: Masters, PGA Championship, US Open, The Open.
                          Not supported: The Players (use manual entry below).
                        </Text>
                      </Box>
                      <Button
                        colorScheme="green"
                        size="sm"
                        leftIcon={<RepeatIcon />}
                        isLoading={importingOdds}
                        loadingText="Importing..."
                        onClick={importOddsFromApi}
                        isDisabled={!selectedTournamentId}
                        flexShrink={0}
                      >
                        Import Odds
                      </Button>
                    </HStack>

                    {oddsImportResult && (
                      <Alert status="success" borderRadius="md" fontSize="sm">
                        <AlertIcon />
                        <Box>
                          <Text fontWeight="600">{oddsImportResult.count} golfers imported</Text>
                          {oddsImportResult.created > 0 && (
                            <Text fontSize="xs">{oddsImportResult.created} new golfers created</Text>
                          )}
                          {oddsImportResult.creditsRemaining && (
                            <Text fontSize="xs" color={mutedText}>
                              Credits used: {oddsImportResult.creditsUsed} · Remaining: {oddsImportResult.creditsRemaining}
                            </Text>
                          )}
                        </Box>
                      </Alert>
                    )}
                  </VStack>
                </CardBody>
              </Card>

              <Divider />

              {/* Manual entry fallback */}
              <Box>
                <Text fontWeight="600" fontSize="sm" mb={1}>Manual Entry</Text>
                <Text fontSize="xs" color={mutedText} mb={3}>
                  Use this for The Players or if the API has no odds yet.
                </Text>
                <FormControl>
                  <Textarea
                    size="sm"
                    fontFamily="mono"
                    fontSize="xs"
                    rows={10}
                    placeholder={`[\n  { "firstName": "Scottie", "lastName": "Scheffler", "fullName": "Scottie Scheffler", "odds": 450 },\n  { "firstName": "Rory", "lastName": "McIlroy", "fullName": "Rory McIlroy", "odds": 800 }\n]`}
                    value={oddsJson}
                    onChange={(e) => setOddsJson(e.target.value)}
                  />
                </FormControl>

                <Alert status="info" borderRadius="md" fontSize="sm" mt={3}>
                  <AlertIcon />
                  American format without the +. e.g. +450 → <Code>450</Code>, +6500 → <Code>6500</Code>.
                  ESPN IDs are optional.
                </Alert>

                <Button
                  mt={3}
                  colorScheme="green"
                  size="sm"
                  isLoading={settingOdds}
                  loadingText="Saving..."
                  onClick={submitOdds}
                >
                  Save Manual Odds
                </Button>
              </Box>
            </VStack>
          </TabPanel>

          {/* ── Sync ── */}
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              <Text fontWeight="600">Sync from ESPN</Text>
              <Text fontSize="sm" color={mutedText}>
                Manually pull the latest leaderboard from ESPN and recalculate all points. Run this during a tournament to update scores.
              </Text>

              <FormControl>
                <FormLabel fontSize="sm">Tournament</FormLabel>
                <Select
                  size="sm"
                  placeholder="Select tournament"
                  value={syncTournamentId}
                  onChange={(e) => setSyncTournamentId(e.target.value)}
                >
                  {tournaments
                    .filter((t) => t.status === 'IN_PROGRESS' || t.status === 'UPCOMING')
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                    ))}
                </Select>
              </FormControl>

              <Button
                colorScheme="blue"
                size="sm"
                leftIcon={<RepeatIcon />}
                isLoading={syncing}
                loadingText="Syncing from ESPN..."
                onClick={triggerSync}
              >
                Sync Now
              </Button>

              {syncResult && (
                <Card bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardBody>
                    <Text fontWeight="600" mb={2} fontSize="sm">Sync Result</Text>
                    <SimpleGrid columns={2} spacing={3} fontSize="sm">
                      <Box>
                        <Text color={mutedText} fontSize="xs">Players synced</Text>
                        <Text fontWeight="600">{syncResult.playersSync}</Text>
                      </Box>
                      <Box>
                        <Text color={mutedText} fontSize="xs">Current round</Text>
                        <Text fontWeight="600">R{syncResult.currentRound}</Text>
                      </Box>
                      <Box>
                        <Text color={mutedText} fontSize="xs">Rounds synced</Text>
                        <Text fontWeight="600">{syncResult.roundsSynced?.join(', ')}</Text>
                      </Box>
                      <Box>
                        <Text color={mutedText} fontSize="xs">Tournament status</Text>
                        <Badge colorScheme={STATUS_COLORS[syncResult.tournamentStatus]}>
                          {syncResult.tournamentStatus}
                        </Badge>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              )}

              <Divider />

              <Box>
                <Text fontWeight="600" fontSize="sm" mb={2}>Finding ESPN Event IDs</Text>
                <Text fontSize="sm" color={mutedText}>
                  Browse to an ESPN golf leaderboard page and check the URL or network requests for the event ID.
                  Example: <Code fontSize="xs">?event=401580334</Code>
                </Text>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  )
}
