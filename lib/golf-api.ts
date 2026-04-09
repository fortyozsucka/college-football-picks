import { apiTracker } from './api-tracker'

const ESPN_BASE = 'https://site.web.api.espn.com/apis/site/v2/sports/golf'

async function fetchESPN(url: string): Promise<any> {
  const startTime = Date.now()
  let success = false
  let error: string | undefined

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      error = `ESPN Golf API error: ${response.status} ${response.statusText}`
      apiTracker.trackCall(url, 'GET', responseTime, false, error)
      throw new Error(error)
    }

    success = true
    const data = await response.json()
    apiTracker.trackCall(url, 'GET', responseTime, true)
    return data
  } catch (e) {
    const responseTime = Date.now() - startTime
    if (!success) {
      error = e instanceof Error ? e.message : 'Unknown error'
      apiTracker.trackCall(url, 'GET', responseTime, false, error)
    }
    throw e
  }
}

// Returns the current or most recent PGA tournament from ESPN's scoreboard
export async function getActiveESPNTournament(): Promise<ESPNTournament | null> {
  const data = await fetchESPN(`${ESPN_BASE}/pga/scoreboard`)
  const events: any[] = data?.events ?? []
  if (events.length === 0) return null
  // Prefer in-progress, fall back to most recent
  return events.find((e) => e.status?.type?.state === 'in') ?? events[0]
}

// Returns all tournaments for a given season year from the PGA calendar.
// The schedule lives in leagues[0].calendar on the scoreboard endpoint.
export async function getESPNTournaments(season: number): Promise<ESPNTournament[]> {
  const data = await fetchESPN(`${ESPN_BASE}/pga/scoreboard`)
  const calendar: any[] = data?.leagues?.[0]?.calendar ?? []

  return calendar.map((entry: any) => ({
    espnId: String(entry.id),
    name: entry.label ?? entry.name ?? '',
    shortName: entry.label ?? entry.name ?? '',
    startDate: entry.startDate,
    endDate: entry.endDate ?? null,
    status: {
      state: 'pre',
      completed: false,
    },
  }))
}

// Returns the full leaderboard for a given ESPN event ID
export async function getESPNLeaderboard(espnEventId: string): Promise<ESPNLeaderboardEntry[]> {
  const data = await fetchESPN(`${ESPN_BASE}/leaderboard?league=pga&event=${espnEventId}`)
  const competitors: any[] = data?.events?.[0]?.competitions?.[0]?.competitors ?? []
  return competitors.map(mapCompetitor)
}

// Returns a single golfer's profile by ESPN athlete ID
export async function getESPNGolfer(espnAthleteId: string): Promise<ESPNGolfer | null> {
  const data = await fetchESPN(`${ESPN_BASE}/pga/athletes/${espnAthleteId}`)
  const athlete = data?.athlete
  if (!athlete) return null
  return {
    espnId: String(athlete.id),
    firstName: athlete.firstName ?? '',
    lastName: athlete.lastName ?? '',
    fullName: athlete.displayName ?? `${athlete.firstName} ${athlete.lastName}`,
    country: athlete.citizenship ?? athlete.flag?.alt ?? null,
    photoUrl: athlete.headshot?.href ?? null,
  }
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapTournament(event: any): ESPNTournament {
  return {
    espnId: String(event.id),
    name: event.name ?? event.shortName,
    shortName: event.shortName ?? event.name,
    startDate: event.date ?? event.competitions?.[0]?.date,
    endDate: event.endDate ?? null,
    status: {
      state: event.status?.type?.state ?? 'pre',
      completed: event.status?.type?.completed ?? false,
    },
  }
}

function mapCompetitor(c: any): ESPNLeaderboardEntry {
  const roundScores: { round: number; score: number }[] = (c.linescores ?? []).map((ls: any) => ({
    round: ls.period ?? ls.type?.id,
    score: ls.value ?? 0,
  }))

  const posDisplay: string = c.status?.position?.displayName ?? c.status?.displayValue ?? ''
  const posUpper = posDisplay.toUpperCase()
  const statusName: string = (c.status?.type?.name ?? '').toLowerCase()
  const statusDesc: string = (c.status?.type?.description ?? '').toLowerCase()

  const missedCut =
    posUpper === 'CUT' ||
    statusName === 'cut' ||
    statusDesc.includes('cut')

  const withdrawn =
    posUpper === 'WD' ||
    posUpper === 'W/D' ||
    posUpper === 'MDF' ||           // Made cut, didn't finish
    statusName === 'wd' ||
    statusName === 'withdrawn' ||
    statusDesc.includes('withdrew') ||
    statusDesc.includes('withdrawal') ||
    statusDesc.includes('disqualif')

  return {
    espnPlayerId: String(c.athlete?.id ?? ''),
    fullName: c.athlete?.displayName ?? '',
    firstName: c.athlete?.firstName ?? '',
    lastName: c.athlete?.lastName ?? '',
    photoUrl: c.athlete?.headshot?.href ?? null,
    position: parseInt(c.status?.position?.id ?? '999', 10),
    positionDisplay: posDisplay,
    totalScore: c.score?.value ?? 0,
    currentRound: c.status?.period ?? 1,
    thru: c.status?.displayValue ?? '-',
    missedCut,
    withdrawn,
    roundScores,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isMajorOrPlayers(name: string): { isTarget: boolean; type: 'MAJOR' | 'PLAYERS' | null } {
  const lower = name.toLowerCase()
  const majors = ['masters', 'pga championship', 'u.s. open', 'us open', 'the open championship', 'british open', 'the open']
  const players = ['the players championship', 'players championship']
  // "the open" check must not accidentally match "the open championship" twice — order is fine since both → MAJOR
  if (majors.some((m) => lower.includes(m))) return { isTarget: true, type: 'MAJOR' }
  if (players.some((p) => lower.includes(p))) return { isTarget: true, type: 'PLAYERS' }
  return { isTarget: false, type: null }
}

export function classifyGolferByOdds(odds: number): 'A' | 'B' | 'C' {
  if (odds < 6000) return 'A'
  if (odds <= 20000) return 'B'
  return 'C'
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ESPNTournament {
  espnId: string
  name: string
  shortName: string
  startDate: string
  endDate: string | null
  status: {
    state: 'pre' | 'in' | 'post' | string
    completed: boolean
  }
}

export interface ESPNLeaderboardEntry {
  espnPlayerId: string
  fullName: string
  firstName: string
  lastName: string
  photoUrl: string | null
  position: number
  positionDisplay: string  // "T3", "CUT", "1", etc.
  totalScore: number       // Score relative to par (e.g. -12)
  currentRound: number
  thru: string             // "F", "12", "-"
  missedCut: boolean
  withdrawn: boolean
  roundScores: { round: number; score: number }[]
}

export interface ESPNGolfer {
  espnId: string
  firstName: string
  lastName: string
  fullName: string
  country: string | null
  photoUrl: string | null
}
