export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { cfbApi } from '@/lib/cfb-api'

// POST /api/admin/backfill-game-metadata?season=2024
// Backfills homeConference, awayConference, homeRank, awayRank for all games
// in a season without touching scores, spreads, or completion status.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const season = parseInt(searchParams.get('season') || new Date().getFullYear().toString())

    // 1. Build conference map from teams endpoint (one call)
    const teams = await cfbApi.getTeams()
    const conferenceByName = new Map<string, string>()
    for (const team of teams) {
      if (team.school && team.conference) {
        conferenceByName.set(team.school, team.conference)
      }
    }

    // 2. Load all games for the season
    const games = await db.game.findMany({
      where: { season },
      select: { id: true, week: true, homeTeam: true, awayTeam: true, gameType: true },
    })

    if (games.length === 0) {
      return NextResponse.json({ message: 'No games found for that season', season, updated: 0 })
    }

    // 3. Fetch AP rankings per unique regular-season week (one call per week)
    const regularWeeks = Array.from(new Set(
      games.filter(g => g.gameType === 'REGULAR' || g.gameType === 'CHAMPIONSHIP')
           .map(g => g.week)
    )).sort((a, b) => a - b)

    const ranksByWeek = new Map<number, Map<string, number>>()
    for (const week of regularWeeks) {
      const seasonType = week >= 14 ? 'postseason' : 'regular'
      const rankMap = await cfbApi.getRankings(season, week, seasonType)
      ranksByWeek.set(week, rankMap)
    }

    // Postseason games: use the last regular-season rankings we have
    const lastRegularRankMap = regularWeeks.length > 0
      ? ranksByWeek.get(regularWeeks[regularWeeks.length - 1]) ?? new Map()
      : new Map<string, number>()

    // 4. Update each game
    let updated = 0
    let skipped = 0

    for (const game of games) {
      const homeConference = conferenceByName.get(game.homeTeam) ?? null
      const awayConference = conferenceByName.get(game.awayTeam) ?? null

      const rankMap = (game.gameType === 'BOWL' || game.gameType === 'PLAYOFF' || game.gameType === 'ARMY_NAVY')
        ? lastRegularRankMap
        : (ranksByWeek.get(game.week) ?? new Map())

      const homeRank = rankMap.get(game.homeTeam) ?? null
      const awayRank = rankMap.get(game.awayTeam) ?? null

      // Only write if at least one value is non-null (avoids touching games with no data at all)
      if (homeConference || awayConference || homeRank !== null || awayRank !== null) {
        await db.game.update({
          where: { id: game.id },
          data: { homeConference, awayConference, homeRank, awayRank },
        })
        updated++
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      message: 'Backfill complete',
      season,
      totalGames: games.length,
      updated,
      skipped,
      weeksProcessed: regularWeeks,
      conferencesLoaded: conferenceByName.size,
    })
  } catch (error) {
    console.error('Backfill error:', error)
    return NextResponse.json(
      { error: 'Backfill failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const season = parseInt(searchParams.get('season') || new Date().getFullYear().toString())

  const counts = await db.game.groupBy({
    by: ['season'],
    where: { season },
    _count: { id: true },
  })

  const withConference = await db.game.count({
    where: { season, homeConference: { not: null } },
  })

  const withRank = await db.game.count({
    where: { season, OR: [{ homeRank: { not: null } }, { awayRank: { not: null } }] },
  })

  const total = counts[0]?._count?.id ?? 0

  return NextResponse.json({
    season,
    total,
    withConference,
    withRank,
    needsBackfill: withConference < total,
  })
}
