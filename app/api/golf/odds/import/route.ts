import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { classifyGolferByOdds } from '@/lib/golf-api'

// Map our tournament names → The Odds API sport keys
const SPORT_KEY_MAP: Record<string, string> = {
  'masters':           'golf_masters_tournament_winner',
  'pga championship':  'golf_pga_championship_winner',
  'u.s. open':         'golf_us_open_winner',
  'us open':           'golf_us_open_winner',
  'the open':          'golf_the_open_championship_winner',
  'open championship': 'golf_the_open_championship_winner',
}

function getSportKey(tournamentName: string): string | null {
  const lower = tournamentName.toLowerCase()
  for (const [key, sportKey] of Object.entries(SPORT_KEY_MAP)) {
    if (lower.includes(key)) return sportKey
  }
  return null
}

// Normalize a name for fuzzy matching: lowercase, strip punctuation/spaces
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

// Extract normalized last name (everything after first word)
function normalizeLast(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.slice(1).join('').toLowerCase().replace(/[^a-z]/g, '')
}

// Try to find a golfer by name with fallbacks
function findGolfer(
  apiName: string,
  golferByNorm: Map<string, { id: string; fullName: string; espnId: string }>
) {
  // 1. Exact normalized match
  const norm = normalizeName(apiName)
  if (golferByNorm.has(norm)) return golferByNorm.get(norm)!

  // 2. Last-name match (handles Matt/Matthew, Rafa/Rafael etc.)
  const apiLast = normalizeLast(apiName)
  if (apiLast.length < 4) return null  // too short to be reliable

  for (const [, golfer] of Array.from(golferByNorm)) {
    const dbLast = normalizeLast(golfer.fullName)
    if (dbLast === apiLast) return golfer
  }

  return null
}

// POST /api/golf/odds/import — admin: fetch odds from The Odds API and save
export async function POST(request: Request) {
  try {
    const current = await getCurrentUser()
    if (!current?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tournamentId } = await request.json()
    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 })
    }

    const tournament = await db.golfTournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const sportKey = getSportKey(tournament.name)
    if (!sportKey) {
      return NextResponse.json({
        error: `No Odds API sport key found for "${tournament.name}". The Players Championship is not supported — use manual entry.`,
        noKey: true,
      }, { status: 422 })
    }

    const apiKey = process.env.ODDS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
    }

    // Fetch from The Odds API — single bookmaker to conserve credits
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?regions=us&oddsFormat=american&markets=outrights&bookmakers=draftkings&apiKey=${apiKey}`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json({
        error: `Odds API error: ${res.status} ${res.statusText}`,
      }, { status: 502 })
    }

    const data = await res.json()
    const outcomes: { name: string; price: number }[] =
      data?.[0]?.bookmakers?.[0]?.markets?.[0]?.outcomes ?? []

    if (outcomes.length === 0) {
      return NextResponse.json({
        error: 'No odds returned from API. The tournament may not have odds available yet.',
      }, { status: 404 })
    }

    // Load existing golfers for name matching
    const existingGolfers = await db.golfer.findMany({
      select: { id: true, fullName: true, espnId: true },
    })
    const golferByNorm = new Map(existingGolfers.map(g => [normalizeName(g.fullName), g]))

    const saved: string[] = []
    const created: string[] = []

    for (const outcome of outcomes) {
      const odds = outcome.price
      const group = classifyGolferByOdds(odds)

      // Find existing golfer by normalized name (with last-name fallback)
      let golfer = findGolfer(outcome.name, golferByNorm)

      if (!golfer) {
        // Create new golfer with slug placeholder
        const parts = outcome.name.trim().split(' ')
        const lastName = parts.slice(1).join(' ') || parts[0]
        const firstName = parts[0]
        const slugId = `slug:${outcome.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

        golfer = await db.golfer.create({
          data: {
            espnId: slugId,
            firstName,
            lastName,
            fullName: outcome.name,
          },
        })
        golferByNorm.set(normalizeName(outcome.name), golfer)
        created.push(outcome.name)
      }

      // Upsert odds
      await db.golferTournamentOdds.upsert({
        where: { golferId_tournamentId: { golferId: golfer.id, tournamentId } },
        create: { golferId: golfer.id, tournamentId, odds, group },
        update: { odds, group },
      })

      saved.push(outcome.name)
    }

    // Check remaining credits from response headers
    const remainingRequests = res.headers.get('x-requests-remaining')
    const usedRequests = res.headers.get('x-requests-used')

    return NextResponse.json({
      success: true,
      count: saved.length,
      created: created.length,
      creditsUsed: usedRequests,
      creditsRemaining: remainingRequests,
      sportKey,
    })
  } catch (error) {
    console.error('Error importing odds:', error)
    return NextResponse.json({ error: 'Failed to import odds' }, { status: 500 })
  }
}
