import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/golf/history — returns all completed tournaments with winner info
export async function GET() {
  try {
    const [results, cutResults] = await Promise.all([
      db.golfTournamentResult.findMany({
        where: { rank: 1, tournament: { status: 'COMPLETED' } },
        include: {
          user: { select: { name: true, email: true } },
          tournament: { select: { id: true, name: true, season: true, tournamentType: true, entryFee: true } },
        },
        orderBy: [{ tournament: { season: 'desc' } }],
      }),
      db.golfTournamentResult.findMany({
        where: { isUserCut: true, tournament: { status: 'COMPLETED' } },
        include: {
          user: { select: { name: true, email: true } },
          tournament: { select: { name: true, season: true } },
        },
      }),
    ])

    return NextResponse.json({
      winners: results.map((r) => ({
        season: r.tournament.season,
        tournamentName: r.tournament.name,
        tournamentType: r.tournament.tournamentType,
        winner: r.user.name ?? r.user.email.split('@')[0],
        totalPoints: r.totalPoints,
        totalUsers: r.totalUsers,
        entryFee: r.tournament.entryFee,
        pot: r.tournament.entryFee != null ? r.tournament.entryFee * r.totalUsers : null,
      })),
      missedCuts: cutResults.map((r) => ({
        season: r.tournament.season,
        tournamentName: r.tournament.name,
        name: r.user.name ?? r.user.email.split('@')[0],
      })),
    })
  } catch (error) {
    console.error('Error fetching golf history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
