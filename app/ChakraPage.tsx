'use client'

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
  Icon,
  Badge,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
} from '@chakra-ui/react'
import { CheckCircleIcon, WarningIcon, InfoIcon, StarIcon, SettingsIcon, TimeIcon } from '@chakra-ui/icons'

const FeatureCard = ({ 
  title, 
  items, 
  icon, 
  colorScheme = 'gray',
  badgeVariant = 'solid'
}: {
  title: string
  items: Array<{ text: string, highlight?: boolean }>
  icon: any
  colorScheme?: string
  badgeVariant?: string
}) => {
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <Card bg={cardBg} borderColor={borderColor} shadow="md" _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.2s">
      <CardBody>
        <HStack spacing={3} mb={4}>
          <Icon as={icon} boxSize={6} color={`${colorScheme}.500`} />
          <Heading size="md" color={`${colorScheme}.800`}>
            {title}
          </Heading>
        </HStack>
        <VStack align="start" spacing={3}>
          {items.map((item, index) => (
            <HStack key={index} align="start">
              <Box
                w={2}
                h={2}
                bg={`${colorScheme}.500`}
                rounded="full"
                mt={2}
                flexShrink={0}
              />
              <Text 
                fontSize="sm" 
                fontWeight={item.highlight ? 'semibold' : 'normal'}
                color={item.highlight ? `${colorScheme}.700` : 'gray.600'}
              >
                {item.text}
              </Text>
            </HStack>
          ))}
        </VStack>
      </CardBody>
    </Card>
  )
}

const UpdateCard = ({ title, description }: { title: string, description: string }) => {
  const cardBg = useColorModeValue('white', 'gray.800')
  
  return (
    <Card bg={cardBg} border="1px" borderColor="football.100" shadow="sm">
      <CardBody>
        <VStack align="start" spacing={2}>
          <HStack>
            <CheckCircleIcon color="football.500" />
            <Text fontWeight="semibold" color="football.800" fontSize="sm">
              {title}
            </Text>
          </HStack>
          <Text fontSize="sm" color="neutral.600">
            {description}
          </Text>
        </VStack>
      </CardBody>
    </Card>
  )
}

export default function ChakraPage() {
  const bgGradient = useColorModeValue('linear(to-br, gray.50, football.50)', 'linear(to-br, gray.900, football.900)')
  
  return (
    <Box bg={bgGradient} minH="100vh" py={8}>
      <Container maxW="6xl">
        {/* Header */}
        <VStack spacing={6} textAlign="center" mb={8}>
          <Heading 
            size="2xl" 
            bgGradient="linear(to-r, neutral.900, brand.600)"
            bgClip="text"
            fontWeight="extrabold"
          >
            🎯 Squad College Football Picks
          </Heading>
          <Text fontSize="xl" color="neutral.600" maxW="2xl">
            Your college football picks application - ready for the season!
          </Text>
        </VStack>

        {/* Scoring Rules Section */}
        <Card mb={8} bg="linear-gradient(to-r, var(--chakra-colors-green-50), var(--chakra-colors-blue-50))" border="2px" borderColor="green.200">
          <CardBody>
            <VStack spacing={6}>
              <HStack spacing={3}>
                <Text fontSize="2xl">🏆</Text>
                <Heading size="xl" color="green.800" textAlign="center">
                  How Scoring Works
                </Heading>
              </HStack>

              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="full">
                {/* Regular Season Rules */}
                <Card bg="white" shadow="md">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack>
                        <Badge colorScheme="blue" variant="solid" fontSize="sm">REGULAR SEASON</Badge>
                        <Text fontSize="lg" fontWeight="bold" color="blue.800">
                          Weeks 1-13
                        </Text>
                      </HStack>
                      
                      <VStack align="start" spacing={2}>
                        <Text fontSize="md" fontWeight="semibold" color="gray.800">📋 Pick Rules:</Text>
                        <Text fontSize="sm">• Choose exactly 5 games per week</Text>
                        <Text fontSize="sm">• One double-down pick required (your choice)</Text>
                        <Text fontSize="sm">• Must pick against the spread</Text>
                        <Text fontSize="sm">• No picks after game starts</Text>
                      </VStack>

                      <Divider />

                      <TableContainer w="full">
                        <Table size="sm">
                          <Thead>
                            <Tr>
                              <Th>Result</Th>
                              <Th>Regular Pick</Th>
                              <Th>Double Down</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            <Tr>
                              <Td fontWeight="semibold" color="green.600">Win</Td>
                              <Td>+1 point</Td>
                              <Td color="green.600" fontWeight="bold">+2 points</Td>
                            </Tr>
                            <Tr>
                              <Td fontWeight="semibold" color="red.600">Loss</Td>
                              <Td>0 points</Td>
                              <Td color="red.600" fontWeight="bold">-1 point</Td>
                            </Tr>
                            <Tr>
                              <Td fontWeight="semibold" color="orange.600">Push</Td>
                              <Td>0 points</Td>
                              <Td color="red.600" fontWeight="bold">-1 point</Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Championship Rules */}
                <Card bg="white" shadow="md">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack>
                        <Badge colorScheme="purple" variant="solid" fontSize="sm">CHAMPIONSHIP</Badge>
                        <Text fontSize="lg" fontWeight="bold" color="purple.800">
                          Weeks 14-15
                        </Text>
                      </HStack>
                      
                      <VStack align="start" spacing={2}>
                        <Text fontSize="md" fontWeight="semibold" color="gray.800">🏆 Special Rules:</Text>
                        <Text fontSize="sm">• Conference Championship games</Text>
                        <Text fontSize="sm" color="purple.600" fontWeight="bold">• ALL picks are mandatory double-downs</Text>
                        <Text fontSize="sm">• Up to 5 championship games</Text>
                        <Text fontSize="sm">• Higher stakes, bigger rewards/penalties</Text>
                      </VStack>

                      <Divider />

                      <VStack align="start" spacing={2} w="full">
                        <Text fontSize="sm" fontWeight="semibold" color="purple.800">Championship Scoring:</Text>
                        <HStack justify="space-between" w="full">
                          <Text fontSize="sm" color="green.600" fontWeight="bold">Win: +2 points</Text>
                          <Text fontSize="sm" color="red.600" fontWeight="bold">Loss/Push: -1 point</Text>
                        </HStack>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Bowl Games Rules */}
                <Card bg="white" shadow="md">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack>
                        <Badge colorScheme="orange" variant="solid" fontSize="sm">BOWL GAMES</Badge>
                        <Text fontSize="lg" fontWeight="bold" color="orange.800">
                          Weeks 15+
                        </Text>
                      </HStack>
                      
                      <VStack align="start" spacing={2}>
                        <Text fontSize="md" fontWeight="semibold" color="gray.800">🏈 Bowl Rules:</Text>
                        <Text fontSize="sm" color="orange.600" fontWeight="bold">• Must pick ALL bowl games</Text>
                        <Text fontSize="sm" color="orange.600" fontWeight="bold">• ALL picks are mandatory double-downs</Text>
                        <Text fontSize="sm">• Don&apos;t count toward 5-game weekly limit</Text>
                        <Text fontSize="sm">• Postseason elimination games</Text>
                      </VStack>

                      <Divider />

                      <VStack align="start" spacing={2} w="full">
                        <Text fontSize="sm" fontWeight="semibold" color="orange.800">Bowl Scoring:</Text>
                        <HStack justify="space-between" w="full">
                          <Text fontSize="sm" color="green.600" fontWeight="bold">Win: +2 points</Text>
                          <Text fontSize="sm" color="red.600" fontWeight="bold">Loss/Push: -1 point</Text>
                        </HStack>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Playoff & Army-Navy Rules */}
                <Card bg="white" shadow="md">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <VStack align="start" spacing={3}>
                        <HStack>
                          <Badge colorScheme="red" variant="solid" fontSize="sm">PLAYOFF</Badge>
                          <Text fontSize="lg" fontWeight="bold" color="red.800">
                            CFP & National Championship
                          </Text>
                        </HStack>
                        
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm">• College Football Playoff games</Text>
                          <Text fontSize="sm">• National Championship</Text>
                          <Text fontSize="sm" color="red.600" fontWeight="bold">• Mandatory double-downs</Text>
                        </VStack>
                      </VStack>

                      <Divider />

                      <VStack align="start" spacing={3}>
                        <HStack>
                          <Badge colorScheme="yellow" variant="solid" fontSize="sm">ARMY-NAVY</Badge>
                          <Text fontSize="lg" fontWeight="bold" color="yellow.800">
                            Special Tradition Game
                          </Text>
                        </HStack>
                        
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm">• Annual Army vs Navy game</Text>
                          <Text fontSize="sm" color="yellow.600" fontWeight="bold">• Mandatory double-down</Text>
                          <Text fontSize="sm">• Usually in December</Text>
                        </VStack>
                      </VStack>

                      <Divider />

                      <VStack align="start" spacing={2} w="full">
                        <Text fontSize="sm" fontWeight="semibold" color="red.800">Special Game Scoring:</Text>
                        <HStack justify="space-between" w="full">
                          <Text fontSize="sm" color="green.600" fontWeight="bold">Win: +2 points</Text>
                          <Text fontSize="sm" color="red.600" fontWeight="bold">Loss/Push: -1 point</Text>
                        </HStack>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              <Divider />

              <VStack spacing={4} textAlign="center">
                <Heading size="md" color="gray.800">🎯 Strategy Tips</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
                  <Card bg="blue.50" border="1px" borderColor="blue.200">
                    <CardBody py={3}>
                      <Text fontSize="sm" fontWeight="bold" color="blue.800">Regular Season</Text>
                      <Text fontSize="xs" color="blue.600">Choose your double-down wisely - it&apos;s high risk, high reward</Text>
                    </CardBody>
                  </Card>
                  <Card bg="purple.50" border="1px" borderColor="purple.200">
                    <CardBody py={3}>
                      <Text fontSize="sm" fontWeight="bold" color="purple.800">Championships</Text>
                      <Text fontSize="xs" color="purple.600">All picks are double-downs - research carefully!</Text>
                    </CardBody>
                  </Card>
                  <Card bg="orange.50" border="1px" borderColor="orange.200">
                    <CardBody py={3}>
                      <Text fontSize="sm" fontWeight="bold" color="orange.800">Bowl Season</Text>
                      <Text fontSize="xs" color="orange.600">Must pick every bowl game - no sitting out!</Text>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Feature Grid */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
          <FeatureCard
            title="✅ Current Features"
            colorScheme="brand"
            icon={CheckCircleIcon}
            items={[
              { text: 'User authentication with invite-only registration' },
              { text: 'Game management with CFB API integration' },
              { text: 'Weekly picks system (5 picks max, 1 double-down)' },
              { text: 'Real-time leaderboard with statistics' },
              { text: 'Team logos and game details with clear spread display' },
              { text: 'Admin panel for invite management and user cleanup' },
              { text: 'Points calculation and pick tracking' },
              { text: 'Mobile-optimized responsive design', highlight: true },
              { text: 'Weekly activation controls with auto-progression', highlight: true },
              { text: 'Email notifications system', highlight: true },
              { text: 'Special game rules (Championship, Bowl, Playoff)', highlight: true },
              { text: 'Pick deadline enforcement', highlight: true },
              { text: 'Railway deployment ready', highlight: true },
            ]}
          />

          <FeatureCard
            title="🚨 High Priority"
            colorScheme="red"
            icon={WarningIcon}
            items={[
              { text: 'Automated Game Syncing - Cron jobs for game updates and point calculation' },
              { text: 'Production Security - Rate limiting, CORS, input validation' },
            ]}
          />

          <FeatureCard
            title="🎨 User Experience"
            colorScheme="blue"
            icon={InfoIcon}
            items={[
              { text: 'Loading States & Error Handling - Better user feedback and error boundaries' },
              { text: 'Dark Mode Toggle - User preference for interface theme' },
              { text: 'Confirmation Dialogs - Confirm important user actions (picks, double-downs)' },
              { text: 'Better Error Messages - Specific guidance and helpful error feedback' },
            ]}
          />

          <FeatureCard
            title="⚡ Enhanced Features"
            colorScheme="purple"
            icon={StarIcon}
            items={[
              { text: 'Confidence Points System - Rank picks 1-5 for strategic play' },
              { text: 'Social Features - Comments, trash talk, achievements' },
              { text: 'Advanced Analytics - Trends, statistics, historical data' },
              { text: 'Multiple Leagues - Support for different groups/competitions' },
            ]}
          />

          <FeatureCard
            title="🛠️ Technical"
            colorScheme="orange"
            icon={SettingsIcon}
            items={[
              { text: 'Database Optimization - Additional indexes, query optimization' },
              { text: 'Caching Layer - Redis for frequently accessed data' },
              { text: 'Testing & Monitoring - Unit tests, error tracking, analytics' },
              { text: 'API Documentation - Swagger/OpenAPI documentation' },
            ]}
          />

          <FeatureCard
            title="⚡ Quick Wins"
            colorScheme="brand"
            icon={TimeIcon}
            items={[
              { text: 'Keyboard Shortcuts - Power user shortcuts for picking' },
              { text: 'Pick History View - Show user\'s previous week picks and results' },
              { text: 'Game Search & Filter - Filter games by team, time, or spread' },
              { text: 'Bulk Pick Actions - Select multiple games at once' },
            ]}
          />
        </SimpleGrid>

        {/* Recent Updates */}
        <Card mb={8} bg="linear-gradient(to-r, var(--chakra-colors-football-50), var(--chakra-colors-blue-50))" border="1px" borderColor="football.200">
          <CardBody>
            <HStack spacing={3} mb={6}>
              <Text fontSize="2xl">🎉</Text>
              <Heading size="lg" color="football.900">
                Recent Updates Completed
              </Heading>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <UpdateCard 
                title="Email Notifications" 
                description="Game results, weekly summaries, and invitation emails with Resend integration" 
              />
              <UpdateCard 
                title="Special Game Rules" 
                description="Championship/Bowl/Playoff games with mandatory double downs and special rules" 
              />
              <UpdateCard 
                title="Mobile Optimization" 
                description="Fully responsive design for mobile picking" 
              />
              <UpdateCard 
                title="Weekly Controls" 
                description="Admin activation with auto-progression logic" 
              />
              <UpdateCard 
                title="Data Cleanup" 
                description="Historical seasons & test users removed" 
              />
              <UpdateCard 
                title="Betting Sources" 
                description="DraftKings → ESPN Bet → Bovada priority" 
              />
              <UpdateCard 
                title="Pick Deadline Management" 
                description="Comprehensive protection preventing picks after games start" 
              />
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Next Steps */}
        <Card bg="linear-gradient(to-r, var(--chakra-colors-red-50), var(--chakra-colors-orange-50))" border="1px" borderColor="red.200">
          <CardBody>
            <HStack spacing={3} mb={6}>
              <Text fontSize="2xl">🎯</Text>
              <Heading size="lg" color="red.900">
                Most Impactful Next Steps
              </Heading>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Card bg="white" border="1px" borderColor="red.100">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Badge colorScheme="red" variant="solid">1</Badge>
                    <Text fontWeight="semibold" color="red.800">
                      Automated Syncing
                    </Text>
                    <Text fontSize="sm" color="neutral.600">
                      Cron jobs for automatic game updates
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card bg="white" border="1px" borderColor="red.100">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Badge colorScheme="red" variant="solid">2</Badge>
                    <Text fontWeight="semibold" color="red.800">
                      Production Security
                    </Text>
                    <Text fontSize="sm" color="neutral.600">
                      Rate limiting and input validation
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card bg="white" border="1px" borderColor="red.100">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Badge colorScheme="red" variant="solid">3</Badge>
                    <Text fontWeight="semibold" color="red.800">
                      Performance Optimization
                    </Text>
                    <Text fontSize="sm" color="neutral.600">
                      Caching and database optimization
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card bg="white" border="1px" borderColor="red.100">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Badge colorScheme="red" variant="solid">4</Badge>
                    <Text fontWeight="semibold" color="red.800">
                      User Experience Polish
                    </Text>
                    <Text fontSize="sm" color="neutral.600">
                      Loading states, error handling, confirmations
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Container>
    </Box>
  )
}