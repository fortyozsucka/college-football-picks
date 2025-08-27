'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useRouter } from 'next/navigation'
import { ApiStats, ApiCall, apiTracker } from '@/lib/api-tracker'
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Badge,
  SimpleGrid,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  Code,
  IconButton,
  useClipboard,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Link as ChakraLink,
} from '@chakra-ui/react'
import { 
  CopyIcon, 
  DeleteIcon, 
  AddIcon, 
  CheckIcon, 
  CloseIcon,
  InfoIcon,
  CalendarIcon,
  SettingsIcon,
  ViewIcon,
  RepeatIcon,
  ExternalLinkIcon
} from '@chakra-ui/icons'

interface Invite {
  id: string
  code: string
  email: string | null
  usedBy: string | null
  isUsed: boolean
  createdBy: string
  createdAt: string
  expiresAt: string | null
}

interface Week {
  week: number
  season: number
  isActive: boolean
  gameCount: number
}

export default function ChakraAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)
  const [weeksLoading, setWeeksLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [newInviteExpiry, setNewInviteExpiry] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [autoProgressing, setAutoProgressing] = useState(false)
  const [apiStats, setApiStats] = useState<ApiStats | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [seasonInfo, setSeasonInfo] = useState<{availableSeasons: number[], archivedSeasons: number[]} | null>(null)
  const [archiving, setArchiving] = useState(false)

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const oddRowBg = useColorModeValue('gray.50', 'gray.700')

  useEffect(() => {
    if (user && !user.isAdmin) {
      router.push('/')
      return
    }
    if (user) {
      fetchInvites()
      fetchWeeks()
    }
  }, [user, router])

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/invites')
      if (!response.ok) {
        throw new Error('Failed to fetch invites')
      }
      const data = await response.json()
      setInvites(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeks = async () => {
    try {
      console.log('Fetching weeks...', { user: user?.isAdmin })
      const response = await fetch('/api/weeks/available')
      console.log('Weeks response:', response.status, response.statusText)
      if (!response.ok) {
        const errorData = await response.text()
        console.error('Weeks error:', errorData)
        throw new Error(`Failed to fetch weeks: ${response.status} - ${errorData}`)
      }
      const data = await response.json()
      console.log('Weeks data:', data)
      setWeeks(data)
    } catch (err) {
      console.error('Fetch weeks error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load weeks')
    } finally {
      setWeeksLoading(false)
    }
  }

  const createInvite = async () => {
    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newInviteEmail || null,
          expiresInDays: newInviteExpiry
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create invite')
      }

      const newInvite = await response.json()
      setInvites([newInvite, ...invites])
      setNewInviteEmail('')
      setNewInviteExpiry(7)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const deleteInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/invites?id=${inviteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete invite')
      }

      setInvites(invites.filter(invite => invite.id !== inviteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invite')
    }
  }

  const toggleWeekActivation = async (week: number, season: number, isActive: boolean) => {
    try {
      const response = await fetch('/api/weeks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week,
          season,
          isActive: !isActive
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update week')
      }

      // Update the local state
      setWeeks(weeks.map(w => 
        w.week === week && w.season === season 
          ? { ...w, isActive: !isActive }
          : w
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update week')
    }
  }

  const triggerAutoProgression = async () => {
    setAutoProgressing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/weeks/auto-progress', {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check week progression')
      }

      const result = await response.json()
      
      if (result.progressed) {
        // Refresh the weeks data if progression happened
        await fetchWeeks()
        alert(`Week progression successful!\n\n${result.log.join('\n')}`)
      } else {
        alert('No week progression needed. Current weeks are either not completed or no next weeks are available.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check week progression')
    } finally {
      setAutoProgressing(false)
    }
  }

  const fetchApiStats = async () => {
    setApiLoading(true)
    try {
      // Get stats directly from client-side tracker
      const stats = apiTracker.getStats()
      setApiStats(stats)
    } catch (err) {
      console.error('Error fetching API stats:', err)
    } finally {
      setApiLoading(false)
    }
  }

  const clearApiHistory = async () => {
    try {
      // Clear history directly from client-side tracker
      apiTracker.clearHistory()
      await fetchApiStats()
      alert('API call history cleared successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear API history')
    }
  }

  const fetchSeasonInfo = async () => {
    try {
      const response = await fetch('/api/admin/archive-season')
      if (response.ok) {
        const info = await response.json()
        setSeasonInfo(info)
      } else {
        console.error('Failed to fetch season info')
      }
    } catch (err) {
      console.error('Error fetching season info:', err)
    }
  }

  const archiveSeason = async (season: number) => {
    setArchiving(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/archive-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ season })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to archive season')
      }

      const result = await response.json()
      await fetchSeasonInfo()
      
      alert(`Successfully archived season ${season}!\n\nChampion: ${result.champion}\nUsers archived: ${result.usersArchived}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive season')
    } finally {
      setArchiving(false)
    }
  }

  // Custom hook for copy functionality
  const InviteCodeRow = ({ invite }: { invite: Invite }) => {
    const { onCopy, hasCopied } = useClipboard(invite.code)
    const isExpired = invite.expiresAt && new Date() > new Date(invite.expiresAt)

    return (
      <Tr key={invite.id}>
        <Td>
          <HStack>
            <Code fontSize="sm" px={2} py={1}>
              {invite.code}
            </Code>
            <IconButton
              aria-label="Copy invite code"
              icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
              size="xs"
              colorScheme={hasCopied ? 'green' : 'blue'}
              variant="ghost"
              onClick={onCopy}
            />
          </HStack>
        </Td>
        <Td>
          {invite.email ? (
            <Text fontSize="sm">{invite.email}</Text>
          ) : (
            <Text fontSize="sm" color="gray.500" fontStyle="italic">
              Generic
            </Text>
          )}
        </Td>
        <Td>
          <Badge
            colorScheme={
              invite.isUsed ? 'green' : isExpired ? 'red' : 'blue'
            }
            variant="solid"
          >
            {invite.isUsed ? 'Used' : isExpired ? 'Expired' : 'Active'}
          </Badge>
        </Td>
        <Td>
          <Text fontSize="sm" color="gray.600">
            {new Date(invite.createdAt).toLocaleDateString()}
          </Text>
        </Td>
        <Td>
          <Text fontSize="sm" color="gray.600">
            {invite.expiresAt 
              ? new Date(invite.expiresAt).toLocaleDateString()
              : 'Never'
            }
          </Text>
        </Td>
        <Td>
          {!invite.isUsed && (
            <IconButton
              aria-label="Delete invite"
              icon={<DeleteIcon />}
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={() => {
                if (confirm('Are you sure you want to delete this invite?')) {
                  deleteInvite(invite.id)
                }
              }}
            />
          )}
        </Td>
      </Tr>
    )
  }

  if (!user) {
    return (
      <Container maxW="4xl" py={12} textAlign="center">
        <Text>Please log in to access the admin panel.</Text>
      </Container>
    )
  }

  if (!user.isAdmin) {
    return (
      <Container maxW="4xl" py={12} textAlign="center">
        <Text>You don&apos;t have permission to access the admin panel.</Text>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={8}>
          <Heading size="xl" textAlign="center">
            ⚡ Admin Panel
          </Heading>
          <Spinner size="xl" color="football.500" thickness="4px" />
          <Text color="gray.600">Loading admin panel...</Text>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <Heading 
            size="2xl"
            bgGradient="linear(to-r, football.600, orange.500)"
            bgClip="text"
          >
            ⚡ Admin Panel
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Manage invite codes, user access, and weekly controls
          </Text>
        </VStack>

        {/* Error Alert */}
        {error && (
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
            <IconButton
              aria-label="Dismiss error"
              icon={<CloseIcon />}
              size="sm"
              variant="ghost"
              onClick={() => setError(null)}
            />
          </Alert>
        )}

        {/* Tabs */}
        <Tabs variant="enclosed" colorScheme="football">
          <TabList>
            <Tab>📧 Invite Codes</Tab>
            <Tab>📅 Weekly Controls</Tab>
            <Tab>📊 API Monitoring</Tab>
            <Tab>🏆 Season Archive</Tab>
          </TabList>

          <TabPanels>
            {/* Invite Codes Tab */}
            <TabPanel px={0}>
              <VStack spacing={6} align="stretch">
                {/* Create Invite Form */}
                <Card bg={cardBg} shadow="md">
                  <CardBody>
                    <Heading size="lg" mb={4} color="football.700">
                      Create New Invite
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Email (optional)</FormLabel>
                        <Input
                          type="email"
                          value={newInviteEmail}
                          onChange={(e) => setNewInviteEmail(e.target.value)}
                          placeholder="Leave empty for generic invite"
                          focusBorderColor="football.500"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Expires in (days)</FormLabel>
                        <NumberInput
                          value={newInviteExpiry}
                          onChange={(valueString, valueNumber) => setNewInviteExpiry(valueNumber || 7)}
                          min={1}
                          max={365}
                          focusBorderColor="football.500"
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel>&nbsp;</FormLabel>
                        <Button
                          leftIcon={<AddIcon />}
                          onClick={createInvite}
                          isLoading={creating}
                          loadingText="Creating..."
                          colorScheme="football"
                          w="full"
                        >
                          Create Invite
                        </Button>
                      </FormControl>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Invites Table */}
                <Card bg={cardBg} shadow="md">
                  <CardBody p={0}>
                    <Box p={6} pb={4}>
                      <Heading size="lg" color="football.700">
                        Invite Codes
                      </Heading>
                    </Box>
                    
                    {invites.length === 0 ? (
                      <Box p={8} textAlign="center" color="gray.500">
                        No invite codes created yet.
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Code</Th>
                              <Th>Email</Th>
                              <Th>Status</Th>
                              <Th>Created</Th>
                              <Th>Expires</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {invites.map((invite) => (
                              <InviteCodeRow key={invite.id} invite={invite} />
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Weekly Controls Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg} shadow="md">
                <CardBody>
                  <Flex 
                    direction={{ base: 'column', md: 'row' }} 
                    justify="space-between" 
                    align={{ base: 'start', md: 'center' }}
                    gap={4}
                    mb={6}
                  >
                    <VStack align="start" spacing={1}>
                      <Heading size="lg" color="football.700">
                        Weekly Activation Controls
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        Control which weeks are active for picking. Weeks automatically progress 24+ hours after all games are completed.
                      </Text>
                    </VStack>
                    
                    <Button
                      leftIcon={<RepeatIcon />}
                      onClick={triggerAutoProgression}
                      isLoading={autoProgressing}
                      loadingText="Checking..."
                      colorScheme="purple"
                      size="md"
                    >
                      Check Auto-Progress
                    </Button>
                  </Flex>
                  
                  {weeksLoading ? (
                    <VStack py={8}>
                      <Spinner size="lg" color="football.500" thickness="3px" />
                      <Text color="gray.600">Loading weeks...</Text>
                    </VStack>
                  ) : weeks.length === 0 ? (
                    <Box py={8} textAlign="center" color="gray.500">
                      No games found. Sync some games first to manage weekly activation.
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table variant="simple" size="md">
                        <Thead>
                          <Tr>
                            <Th>Week</Th>
                            <Th>Season</Th>
                            <Th isNumeric>Games</Th>
                            <Th textAlign="center">Status</Th>
                            <Th textAlign="center">Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {weeks.map((week) => (
                            <Tr key={`${week.season}-${week.week}`} _hover={{ bg: oddRowBg }}>
                              <Td fontWeight="medium">Week {week.week}</Td>
                              <Td>{week.season}</Td>
                              <Td isNumeric>{week.gameCount} games</Td>
                              <Td textAlign="center">
                                <Badge
                                  colorScheme={week.isActive ? 'green' : 'gray'}
                                  variant="solid"
                                >
                                  {week.isActive ? '✅ Active' : '⏸️ Inactive'}
                                </Badge>
                              </Td>
                              <Td textAlign="center">
                                <Button
                                  onClick={() => toggleWeekActivation(week.week, week.season, week.isActive)}
                                  colorScheme={week.isActive ? 'red' : 'green'}
                                  variant="outline"
                                  size="sm"
                                >
                                  {week.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  )}
                </CardBody>
              </Card>
            </TabPanel>

            {/* API Monitoring Tab */}
            <TabPanel px={0}>
              <VStack spacing={6} align="stretch">
                {/* API Statistics */}
                <Card bg={cardBg} shadow="md">
                  <CardBody>
                    <Flex 
                      direction={{ base: 'column', md: 'row' }} 
                      justify="space-between" 
                      align={{ base: 'start', md: 'center' }}
                      gap={4}
                      mb={6}
                    >
                      <VStack align="start" spacing={1}>
                        <Heading size="lg" color="football.700">
                          College Football Data API Usage
                        </Heading>
                        <Text fontSize="sm" color="gray.600">
                          Monitor your API call usage and performance to track tier limits
                        </Text>
                      </VStack>
                      
                      <HStack>
                        <Button
                          leftIcon={<ViewIcon />}
                          onClick={fetchApiStats}
                          isLoading={apiLoading}
                          loadingText="Refreshing..."
                          colorScheme="blue"
                          size="sm"
                        >
                          Refresh
                        </Button>
                        <Button
                          onClick={clearApiHistory}
                          colorScheme="red"
                          variant="outline"
                          size="sm"
                        >
                          Clear History
                        </Button>
                      </HStack>
                    </Flex>
                    
                    {apiLoading ? (
                      <VStack py={8}>
                        <Spinner size="lg" color="football.500" thickness="3px" />
                        <Text color="gray.600">Loading API statistics...</Text>
                      </VStack>
                    ) : apiStats ? (
                      <VStack spacing={6} align="stretch">
                        {/* Stats Cards */}
                        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                          <Stat bg="blue.50" p={4} borderRadius="lg" border="1px" borderColor="blue.200">
                            <StatNumber fontSize="2xl" color="blue.900">{apiStats.callsToday}</StatNumber>
                            <StatLabel color="blue.700">Today</StatLabel>
                          </Stat>
                          <Stat bg="green.50" p={4} borderRadius="lg" border="1px" borderColor="green.200">
                            <StatNumber fontSize="2xl" color="green.900">{apiStats.callsThisWeek}</StatNumber>
                            <StatLabel color="green.700">This Week</StatLabel>
                          </Stat>
                          <Stat bg="purple.50" p={4} borderRadius="lg" border="1px" borderColor="purple.200">
                            <StatNumber fontSize="2xl" color="purple.900">{apiStats.callsThisMonth}</StatNumber>
                            <StatLabel color="purple.700">This Month</StatLabel>
                          </Stat>
                          <Stat bg="gray.50" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
                            <StatNumber fontSize="2xl" color="gray.900">{apiStats.totalCalls}</StatNumber>
                            <StatLabel color="gray.700">Total</StatLabel>
                          </Stat>
                        </SimpleGrid>

                        {/* Performance Metrics */}
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <Stat bg="orange.50" p={4} borderRadius="lg" border="1px" borderColor="orange.200">
                            <StatNumber fontSize="lg" color="orange.900">{apiStats.averageResponseTime}ms</StatNumber>
                            <StatLabel color="orange.700">Average Response Time</StatLabel>
                          </Stat>
                          <Stat bg="emerald.50" p={4} borderRadius="lg" border="1px" borderColor="emerald.200">
                            <StatNumber fontSize="lg" color="emerald.900">{apiStats.successRate}%</StatNumber>
                            <StatLabel color="emerald.700">Success Rate</StatLabel>
                          </Stat>
                        </SimpleGrid>

                        {/* Recent Calls */}
                        {apiStats.recentCalls.length > 0 && (
                          <VStack align="stretch" spacing={3}>
                            <Heading size="md" color="gray.900">Recent API Calls</Heading>
                            <TableContainer>
                              <Table variant="simple" size="sm">
                                <Thead>
                                  <Tr>
                                    <Th>Timestamp</Th>
                                    <Th>Endpoint</Th>
                                    <Th>Response Time</Th>
                                    <Th>Status</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {apiStats.recentCalls.slice(0, 20).map((call, index) => (
                                    <Tr key={index} _hover={{ bg: oddRowBg }}>
                                      <Td fontSize="xs">{new Date(call.timestamp).toLocaleString()}</Td>
                                      <Td>
                                        <Code fontSize="xs">{call.endpoint}</Code>
                                      </Td>
                                      <Td>{call.responseTime}ms</Td>
                                      <Td>
                                        <Badge
                                          colorScheme={call.success ? 'green' : 'red'}
                                          variant="solid"
                                        >
                                          {call.success ? '✓ Success' : '✗ Failed'}
                                        </Badge>
                                      </Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>
                          </VStack>
                        )}
                      </VStack>
                    ) : (
                      <Box py={8} textAlign="center" color="gray.500">
                        <Text>No API call data available yet.</Text>
                        <Text fontSize="sm" mt={1}>Data will appear after making CFB API calls.</Text>
                      </Box>
                    )}
                  </CardBody>
                </Card>

                {/* API Tier Information */}
                <Alert status="warning" borderRadius="lg">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>📋 College Football Data API Tiers</AlertTitle>
                    <VStack align="start" spacing={2} mt={2} fontSize="sm">
                      <Flex justify="space-between" w="full"><Text fontWeight="medium">Free Tier:</Text> <Text>200 calls/hour</Text></Flex>
                      <Flex justify="space-between" w="full"><Text fontWeight="medium">Patreon ($5):</Text> <Text>1,000 calls/hour</Text></Flex>
                      <Flex justify="space-between" w="full"><Text fontWeight="medium">Patreon ($10):</Text> <Text>5,000 calls/hour</Text></Flex>
                      <Flex justify="space-between" w="full"><Text fontWeight="medium">Patreon ($20):</Text> <Text>Unlimited</Text></Flex>
                    </VStack>
                    <Text fontSize="xs" mt={3}>
                      Monitor your usage above to determine if you need to upgrade tiers. 
                      A typical weekly sync uses 3 API calls (games, lines, teams).
                    </Text>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>

            {/* Season Archive Tab */}
            <TabPanel px={0}>
              <VStack spacing={6} align="stretch">
                {/* Archive Management */}
                <Card bg={cardBg} shadow="md">
                  <CardBody>
                    <VStack align="start" spacing={4} mb={6}>
                      <Heading size="lg" color="football.700">
                        Season Archive Management
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        Archive completed seasons to preserve historical leaderboard data permanently
                      </Text>
                    </VStack>
                    
                    {seasonInfo ? (
                      <VStack spacing={6} align="stretch">
                        {/* Available Seasons to Archive */}
                        {seasonInfo.availableSeasons.length > 0 && (
                          <VStack align="stretch" spacing={3}>
                            <Heading size="md" color="gray.900">Available for Archiving</Heading>
                            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                              {seasonInfo.availableSeasons.map((season) => (
                                <Card key={season} bg="blue.50" borderColor="blue.200" borderWidth="1px">
                                  <CardBody textAlign="center">
                                    <VStack spacing={3}>
                                      <Text fontSize="2xl" fontWeight="bold" color="blue.900">
                                        Season {season}
                                      </Text>
                                      <Button
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to archive season ${season}? This will preserve the final leaderboard permanently and cannot be undone.`)) {
                                            archiveSeason(season)
                                          }
                                        }}
                                        isLoading={archiving}
                                        loadingText="Archiving..."
                                        colorScheme="blue"
                                        w="full"
                                      >
                                        Archive Season
                                      </Button>
                                    </VStack>
                                  </CardBody>
                                </Card>
                              ))}
                            </SimpleGrid>
                          </VStack>
                        )}

                        {/* Already Archived Seasons */}
                        {seasonInfo.archivedSeasons.length > 0 && (
                          <VStack align="stretch" spacing={3}>
                            <Heading size="md" color="gray.900">Archived Seasons</Heading>
                            <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
                              {seasonInfo.archivedSeasons.map((season) => (
                                <Card key={season} bg="green.50" borderColor="green.200" borderWidth="1px">
                                  <CardBody textAlign="center">
                                    <VStack spacing={2}>
                                      <Text fontSize="lg" fontWeight="semibold" color="green.900">
                                        Season {season}
                                      </Text>
                                      <Badge colorScheme="green" variant="solid">
                                        ✓ Archived
                                      </Badge>
                                    </VStack>
                                  </CardBody>
                                </Card>
                              ))}
                            </SimpleGrid>
                          </VStack>
                        )}

                        {/* No seasons message */}
                        {seasonInfo.availableSeasons.length === 0 && seasonInfo.archivedSeasons.length === 0 && (
                          <Box py={8} textAlign="center" color="gray.500">
                            <Text>No season data available for archiving.</Text>
                            <Text fontSize="sm" mt={1}>Seasons will appear here after games have been synced.</Text>
                          </Box>
                        )}
                      </VStack>
                    ) : (
                      <VStack py={8}>
                        <Spinner size="lg" color="football.500" thickness="3px" />
                        <Text color="gray.600">Loading season information...</Text>
                      </VStack>
                    )}
                  </CardBody>
                </Card>

                {/* How It Works */}
                <Alert status="info" borderRadius="lg">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>📋 How Season Archiving Works</AlertTitle>
                    <VStack align="start" spacing={2} mt={2} fontSize="sm">
                      <Text>• <Text as="span" fontWeight="bold">Archives final standings:</Text> Preserves user rankings, scores, and statistics permanently</Text>
                      <Text>• <Text as="span" fontWeight="bold">Cannot be undone:</Text> Once archived, the historical data is permanent</Text>
                      <Text>• <Text as="span" fontWeight="bold">Prevents duplicates:</Text> Each season can only be archived once</Text>
                      <Text>• <Text as="span" fontWeight="bold">Creates historical record:</Text> Data becomes available in the History page for all users</Text>
                    </VStack>
                    <Box mt={4} p={3} bg="blue.100" borderRadius="lg">
                      <Text fontSize="xs">
                        <Text as="span" fontWeight="bold">Best Practice:</Text> Archive seasons after they are completely finished and all picks have been scored.
                        This preserves the final leaderboard state and creates a permanent historical record.
                      </Text>
                    </Box>
                  </Box>
                </Alert>

                {/* View Historical Data Link */}
                <Card bg="gray.50" borderColor="gray.200" borderWidth="1px">
                  <CardBody textAlign="center">
                    <VStack spacing={4}>
                      <Heading size="md" color="gray.900">View Historical Data</Heading>
                      <Text fontSize="sm" color="gray.600">
                        View archived season leaderboards and historical statistics
                      </Text>
                      <ChakraLink href="/history" isExternal>
                        <Button leftIcon={<ExternalLinkIcon />} colorScheme="gray">
                          🏆 View Historical Leaderboards
                        </Button>
                      </ChakraLink>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  )
}