import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/golf/history — returns all completed tournaments with winner info
export async function GET() {
  try {
    const results = await db.golfTournamentResult.findMany({
      where: { rank: 1 },
      include: {
        user: { select: { name: true, email: true } },
        tournament: { select: { id: true, name: true, season: true, tournamentType: true } },
      },
      orderBy: [{ tournament: { season: 'desc' } }],
    })

    return NextResponse.json(
      results.map((r) => ({
        season: r.tournament.season,
        tournamentName: r.tournament.name,
        tournamentType: r.tournament.tournamentType,
        winner: r.user.name ?? r.user.email.split('@')[0],
        totalPoints: r.totalPoints,
        totalUsers: r.totalUsers,
      }))
    )
  } catch (error) {
    console.error('Error fetching golf history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
