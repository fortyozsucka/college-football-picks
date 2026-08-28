'use client'

import { useEffect, useState } from 'react'
import {
  Box, VStack, HStack, Text, Progress, SimpleGrid,
  Spinner, useColorModeValue, Divider, Flex, ButtonGroup, Button,
} from '@chakra-ui/react'

interface RecordData {
  wins: number
  losses: number
  pushes: number
  total: number
  pct: number
}

interface NarrativeData {
  label: string
  record: string
  pct: number
  wins: number
  losses: number
}

interface ConferenceEntry extends RecordData {
  conference: string
}

interface DNAData {
  overall: RecordData
  byHomeFav: RecordData
  byRoadFav: RecordData
  byHomeDog: RecordData
  byRoadDog: RecordData
  byFavorite: RecordData
  byUnderdog: RecordData
  byRanked: RecordData
  byUnranked: RecordData
  bySpreadBucket: Array<{ label: string } & RecordData>
  byGameType: { REGULAR: RecordData; BOWL: RecordData; PLAYOFF: RecordData; CHAMPIONSHIP: RecordData }
  byConference: ConferenceEntry[]
  kryptoniteConference: NarrativeData & { conference: string } | null
  superpowerConference: NarrativeData & { conference: string } | null
  superpower: NarrativeData | null
  kryptonite: NarrativeData | null
  biggestLeak: NarrativeData | null
  totalPicks: number
  hasConferenceData: boolean
  hasRankData: boolean
  insufficient?: boolean
}

function pctColor(pct: number): string {
  if (pct >= 57) return 'green'
  if (pct >= 50) return 'yellow'
  return 'red'
}

function pctTextColor(pct: number, dark: boolean): string {
  if (pct >= 57) return dark ? '#6ade9c' : '#276749'
  if (pct >= 50) return dark ? '#f6e05e' : '#744210'
  return dark ? '#fc8181' : '#9b2c2c'
}

interface SituationCellProps {
  label: string
  rec: RecordData
  minPicks?: number
}

const MIN_PICKS = 3

function getCurrentSeason(): number {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

export default function PickingDNA({ userId }: { userId: string }) {
  const [data, setData] = useState<DNAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'current'>('all')

  const currentSeason = getCurrentSeason()
  const isDark = useColorModeValue(false, true)
  const cellBg = useColorModeValue('neutral.50', 'rgba(255,255,255,0.04)')
  const cellBorder = useColorModeValue('neutral.200', 'rgba(255,255,255,0.08)')
  const labelColor = useColorModeValue('neutral.500', 'neutral.400')
  const sectionLabelColor = useColorModeValue('neutral.700', 'neutral.300')
  const mutedText = useColorModeValue('neutral.500', 'neutral.400')
  const toggleBg = useColorModeValue('neutral.100', 'rgba(255,255,255,0.06)')
  const activeBtn = useColorModeValue('white', 'rgba(255,255,255,0.12)')

  useEffect(() => {
    setLoading(true)
    setData(null)
    setFetchError(false)
    const url = seasonFilter === 'current'
      ? `/api/users/${userId}/picking-dna?season=${currentSeason}`
      : `/api/users/${userId}/picking-dna`
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setFetchError(true); setLoading(false) })
  }, [userId, seasonFilter])

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="md" color="brand.400" />
        <Text mt={3} fontSize="sm" color={mutedText}>Analyzing your picks...</Text>
      </Box>
    )
  }

  if (fetchError) {
    return (
      <Box textAlign="center" py={8}>
        <Text fontSize="sm" color={mutedText}>
          Could not load DNA data. Make sure the database migration has been deployed.
        </Text>
      </Box>
    )
  }

  if (!data || data.insufficient) {
    return (
      <Box textAlign="center" py={8}>
        <Text fontSize="sm" color={mutedText}>
          {seasonFilter === 'current'
            ? `Not enough picks this season yet — need at least 5 completed picks.`
            : `Not enough data yet — need at least 5 completed picks to generate DNA.`}
        </Text>
      </Box>
    )
  }

  const SituationCell = ({ label, rec }: SituationCellProps) => {
    const hasData = rec.total >= MIN_PICKS
    const color = hasData ? pctColor(rec.pct) : 'gray'
    const textColor = hasData ? pctTextColor(rec.pct, isDark) : (isDark ? '#718096' : '#a0aec0')

    return (
      <Box bg={cellBg} borderRadius="xl" p={3.5} border="1px solid" borderColor={cellBorder}>
        <Text fontSize="xs" color={labelColor} fontWeight="600" mb={2} textTransform="uppercase" letterSpacing="0.06em">
          {label}
        </Text>
        {hasData ? (
          <>
            <HStack justify="space-between" align="flex-end" mb={1.5}>
              <Text fontSize="2xl" fontWeight="800" color={textColor} lineHeight="1">
                {rec.pct.toFixed(0)}%
              </Text>
              <Text fontSize="xs" color={mutedText} fontWeight="600">
                {rec.wins}–{rec.losses}{rec.pushes > 0 ? `–${rec.pushes}` : ''}
              </Text>
            </HStack>
            <Progress value={rec.pct} colorScheme={color} size="xs" borderRadius="full" />
          </>
        ) : (
          <Text fontSize="sm" color={mutedText} mt={1}>Not enough data</Text>
        )}
      </Box>
    )
  }

  const SpreadRow = ({ label, rec }: { label: string; rec: RecordData }) => {
    const hasData = rec.total >= MIN_PICKS
    const color = hasData ? pctColor(rec.pct) : 'gray'
    const textColor = hasData ? pctTextColor(rec.pct, isDark) : (isDark ? '#718096' : '#a0aec0')

    return (
      <Box>
        <Flex justify="space-between" align="center" mb={1}>
          <HStack spacing={2}>
            <Text fontSize="xs" fontWeight="700" color={sectionLabelColor} w="14">{label}</Text>
            {hasData && (
              <Text fontSize="xs" color={mutedText}>
                {rec.wins}–{rec.losses}
              </Text>
            )}
          </HStack>
          <Text fontSize="sm" fontWeight="700" color={textColor}>
            {hasData ? `${rec.pct.toFixed(0)}%` : '—'}
          </Text>
        </Flex>
        <Progress
          value={hasData ? rec.pct : 0}
          colorScheme={color}
          size="sm"
          borderRadius="full"
          bg={cellBg}
        />
      </Box>
    )
  }

  const NarrativeCard = ({
    icon, title, data, accent,
  }: { icon: string; title: string; data: NarrativeData; accent: string }) => (
    <Box
      borderRadius="xl"
      p={4}
      border="1px solid"
      borderColor={accent}
      bg={useColorModeValue(`${accent}10`, `${accent}14`)}
      position="relative"
      overflow="hidden"
    >
      <HStack spacing={3} mb={1}>
        <Text fontSize="lg" lineHeight="1">{icon}</Text>
        <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.1em" color={labelColor}>
          {title}
        </Text>
      </HStack>
      <Text fontSize="sm" fontWeight="700" color={sectionLabelColor} mb={0.5}>
        {data.label}
      </Text>
      <HStack spacing={2} align="center">
        <Text fontSize="xl" fontWeight="900" color={accent}>
          {data.pct.toFixed(0)}%
        </Text>
        <Text fontSize="sm" color={mutedText}>
          {data.record} ATS
        </Text>
      </HStack>
    </Box>
  )

  const fav = data.byFavorite
  const dog = data.byUnderdog
  const favPct = fav.total > 0 ? (fav.total / (fav.total + dog.total)) * 100 : 0

  const gameTypeRows = [
    { label: 'Regular Season', rec: data.byGameType.REGULAR },
    { label: 'Bowl Games', rec: data.byGameType.BOWL },
    { label: 'Playoffs', rec: data.byGameType.PLAYOFF },
    { label: 'Championships', rec: data.byGameType.CHAMPIONSHIP },
  ].filter(r => r.rec.total > 0)

  return (
    <VStack spacing={5} align="stretch">
      {/* Season toggle */}
      <Flex justify="center">
        <Box bg={toggleBg} borderRadius="xl" p={1} display="inline-flex">
          <ButtonGroup size="sm" spacing={0}>
            <Button
              variant="ghost"
              borderRadius="lg"
              px={4}
              bg={seasonFilter === 'all' ? activeBtn : 'transparent'}
              fontWeight={seasonFilter === 'all' ? '700' : '500'}
              color={seasonFilter === 'all' ? sectionLabelColor : mutedText}
              onClick={() => setSeasonFilter('all')}
              _hover={{ bg: activeBtn }}
            >
              All Time
            </Button>
            <Button
              variant="ghost"
              borderRadius="lg"
              px={4}
              bg={seasonFilter === 'current' ? activeBtn : 'transparent'}
              fontWeight={seasonFilter === 'current' ? '700' : '500'}
              color={seasonFilter === 'current' ? sectionLabelColor : mutedText}
              onClick={() => setSeasonFilter('current')}
              _hover={{ bg: activeBtn }}
            >
              {currentSeason} Season
            </Button>
          </ButtonGroup>
        </Box>
      </Flex>

      {/* Overall ATS */}
      <Box textAlign="center" py={2}>
        <Text fontSize="xs" fontWeight="700" color={labelColor} textTransform="uppercase" letterSpacing="0.1em" mb={1}>
          Overall ATS
        </Text>
        <Text
          fontSize="4xl"
          fontWeight="900"
          color={pctTextColor(data.overall.pct, isDark)}
          lineHeight="1"
        >
          {data.overall.pct.toFixed(1)}%
        </Text>
        <Text fontSize="sm" color={mutedText} mt={1}>
          {data.overall.wins}–{data.overall.losses}{data.overall.pushes > 0 ? `–${data.overall.pushes}` : ''} on {data.totalPicks} picks
        </Text>
      </Box>

      <Divider />

      {/* 2×2 Situational Grid */}
      <Box>
        <Text fontSize="xs" fontWeight="700" color={labelColor} textTransform="uppercase" letterSpacing="0.1em" mb={3}>
          Situational Breakdown
        </Text>
        <SimpleGrid columns={2} spacing={2.5}>
          <SituationCell label="Home Favorite" rec={data.byHomeFav} />
          <SituationCell label="Road Favorite" rec={data.byRoadFav} />
          <SituationCell label="Home Underdog" rec={data.byHomeDog} />
          <SituationCell label="Road Underdog" rec={data.byRoadDog} />
        </SimpleGrid>
      </Box>

      {/* Pick Tendency Bar */}
      <Box bg={cellBg} borderRadius="xl" p={4} border="1px solid" borderColor={cellBorder}>
        <Text fontSize="xs" fontWeight="700" color={labelColor} textTransform="uppercase" letterSpacing="0.1em" mb={3}>
          Pick Tendencies
        </Text>
        <HStack spacing={0} h="6" borderRadius="full" overflow="hidden" mb={2}>
          <Box
            h="full"
            w={`${favPct}%`}
            bg={useColorModeValue('blue.400', 'blue.500')}
            transition="width 0.5s ease"
          />
          <Box
            h="full"
            flex="1"
            bg={useColorModeValue('orange.300', 'orange.600')}
          />
        </HStack>
        <HStack justify="space-between">
          <HStack spacing={1.5}>
            <Box w={2.5} h={2.5} borderRadius="sm" bg={useColorModeValue('blue.400', 'blue.500')} />
            <Text fontSize="xs" color={sectionLabelColor} fontWeight="600">
              Favorites {favPct.toFixed(0)}%
              {fav.total > 0 && <Text as="span" color={mutedText}> ({fav.wins}–{fav.losses})</Text>}
            </Text>
          </HStack>
          <HStack spacing={1.5}>
            <Text fontSize="xs" color={sectionLabelColor} fontWeight="600">
              Underdogs {(100 - favPct).toFixed(0)}%
              {dog.total > 0 && <Text as="span" color={mutedText}> ({dog.wins}–{dog.losses})</Text>}
            </Text>
            <Box w={2.5} h={2.5} borderRadius="sm" bg={useColorModeValue('orange.300', 'orange.600')} />
          </HStack>
        </HStack>
      </Box>

      {/* Spread Breakdown */}
      <Box>
        <Text fontSize="xs" fontWeight="700" color={labelColor} textTransform="uppercase" letterSpacing="0.1em" mb={3}>
          By Spread Size
        </Text>
        <VStack spacing={3} align="stretch">
          {data.bySpreadBucket.map(b => (
            <SpreadRow key={b.label} label={b.label} rec={b} />
          ))}
        </VStack>
      </Box>

      {/* Ranked vs. Unranked */}
      {data.hasRankData && (
        <Box>
          <Text fontSize="xs" fontWeight="700" color={labelColor} textTransform="uppercase" letterSpacing="0.1em" mb={3}>
            Ranked vs. Unranked Teams
          </Text>
          <SimpleGrid columns={2} spacing={2.5}>
            <SituationCell label="Ranked Teams" rec={data.byRanked} />
            <SituationCell label="Unranked Teams" rec={data.byUnranked} />
          </SimpleGrid>
        </Box>
      )}

      {/* Conference Breakdown */}
      {data.hasConferenceData && data.byConference.length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="700" color={labelColor} textTransform="uppercase" letterSpacing="0.1em" mb={3}>
            By Conference
          </Text>
          <VStack spacing={2.5} align="stretch">
            {data.byConference
              .sort((a, b) => b.total - a.total)
              .slice(0, 8)
              .map(c => (
                <SpreadRow
                  key={c.conference}
                  label={c.conference}
                  rec={c}
                />
              ))}
          </VStack>
        </Box>
      )}

      {/* Game Type Breakdown */}
      {gameTypeRows.length > 1 && (
        <Box>
          <Text fontSize="xs" fontWeight="700" color={labelColor} textTransform="uppercase" letterSpacing="0.1em" mb={3}>
            By Game Type
          </Text>
          <SimpleGrid columns={2} spacing={2.5}>
            {gameTypeRows.map(({ label, rec }) => (
              <SituationCell key={label} label={label} rec={rec} />
            ))}
          </SimpleGrid>
        </Box>
      )}

      <Divider />

      {/* Narratives */}
      <VStack spacing={3} align="stretch">
        {data.superpower && (
          <NarrativeCard
            icon="⚡"
            title="Your Superpower"
            data={data.superpower}
            accent={useColorModeValue('#276749', '#6ade9c')}
          />
        )}
        {data.kryptonite && (
          <NarrativeCard
            icon="☠️"
            title="Your Kryptonite Conference"
            data={data.kryptonite}
            accent={useColorModeValue('#9b2c2c', '#fc8181')}
          />
        )}
        {!data.kryptonite && (
          <Box borderRadius="xl" p={4} border="1px solid" borderColor={cellBorder} bg={cellBg}>
            <HStack spacing={3} mb={1}>
              <Text fontSize="lg" lineHeight="1">☠️</Text>
              <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.1em" color={labelColor}>
                Your Kryptonite Conference
              </Text>
            </HStack>
            <Text fontSize="sm" color={mutedText}>
              Conference data unavailable — an admin needs to run the season backfill.
            </Text>
          </Box>
        )}
        {data.biggestLeak && (
          <NarrativeCard
            icon="📉"
            title="Biggest Leak"
            data={data.biggestLeak}
            accent={useColorModeValue('#7b341e', '#f6ad55')}
          />
        )}
      </VStack>
    </VStack>
  )
}
