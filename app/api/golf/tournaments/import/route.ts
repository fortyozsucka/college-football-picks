import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getESPNTournaments, isMajorOrPlayers } from '@/lib/golf-api'
import { getCurrentUser } from '@/lib/auth'

// POST /api/golf/tournaments/import
// Fetches the PGA schedule from ESPN and imports Majors + The Players for a given season.
// Skips tournaments that already exist in the DB.
export async function POST(request: Request) {
  try {
    const current = await getCurrentUser()
    if (!current?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { season } = await request.json()
    const targetSeason = parseInt(season) || new Date().getFullYear()

    const espnTournaments = await getESPNTournaments(targetSeason)

    if (espnTournaments.length === 0) {
      return NextResponse.json({
        error: `ESPN returned no events for ${targetSeason}. The schedule may not be published yet.`,
      }, { status: 404 })
    }

    // Filter to only Majors + The Players
    const targets = espnTournaments.filter((t) => isMajorOrPlayers(t.name).isTarget)

    if (targets.length === 0) {
      return NextResponse.json({
        error: `Found ${espnTournaments.length} ESPN events but none matched Majors or The Players for ${targetSeason}.`,
        allEvents: espnTournaments.map((t) => t.name),
      }, { status: 404 })
    }

    const results = { imported: [] as string[], updated: [] as string[], skipped: [] as string[], errors: [] as string[] }
    const now = new Date()

    for (const t of targets) {
      try {
        const startDate = new Date(t.startDate)
        const endDate = t.endDate ? new Date(t.endDate) : startDate

        // Only auto-complete from dates — don't infer IN_PROGRESS from start date
        // because ESPN's start date often includes practice rounds before competitive play.
        // The sync job handles UPCOMING → IN_PROGRESS when scores appear.
        const status = endDate < now ? 'COMPLETED' : 'UPCOMING'

        const { type } = isMajorOrPlayers(t.name)
        const existing = await db.golfTournament.findUnique({ where: { espnId: t.espnId } })

        if (existing) {
          // Update status if it's wrong (e.g. still UPCOMING after tournament ended)
          if (existing.status !== status) {
            await db.golfTournament.update({
              where: { espnId: t.espnId },
              data: { status },
            })
            results.updated.push(`${t.name} → ${status}`)
          } else {
            results.skipped.push(t.name)
          }
          continue
        }

        const tournament = await db.golfTournament.create({
          data: {
            espnId: t.espnId,
            name: t.name,
            tournamentType: type ?? 'MAJOR',
            startDate,
            endDate,
            season: targetSeason,
            status,
          },
        })

        // Pre-create 4 round records
        await db.golfRound.createMany({
          data: [1, 2, 3, 4].map((n) => ({
            tournamentId: tournament.id,
            roundNumber: n,
            roundDate: startDate,
            status: 'NOT_STARTED',
          })),
        })

        results.imported.push(`${t.name} (${status})`)
      } catch (e) {
        results.errors.push(`${t.name}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      season: targetSeason,
      espnEventsTotal: espnTournaments.length,
      targetEventsFound: targets.length,
      ...results,
    })
  } catch (error) {
    console.error('Error importing tournaments from ESPN:', error)
    return NextResponse.json({ error: 'Failed to import tournaments' }, { status: 500 })
  }
}
