import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { getESPNLeaderboard } from '@/lib/golf-api'
import {
  calculateRoundPoints,
  processRound2Cuts,
  calculateTournamentBonuses,
  archiveTournamentResults,
} from '@/lib/golf-scoring'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const headersList = headers()
    const cronSecret = headersList.get('Authorization')

    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Golf majors run Thu–Sun. Only sync during those days and reasonable hours (7am–11pm ET).
    const dayOfWeek = now.getDay() // 0=Sun, 4=Thu, 5=Fri, 6=Sat
    const hour = now.getUTCHours() - 5 // rough ET offset (no DST handling needed for a cron window)
    const isTournamentDay = dayOfWeek >= 4 || dayOfWeek === 0 // Thu, Fri, Sat, Sun
    const isPlayingHours = hour >= 7 && hour <= 23

    // Find all in-progress golf tournaments
    const activeTournaments = await db.golfTournament.findMany({
      where: { status: 'IN_PROGRESS', isActive: true },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    })

    if (activeTournaments.length === 0) {
      return NextResponse.json({
        message: 'No active golf tournaments — skipping',
        timestamp: now.toISOString(),
        action: 'skipped',
      })
    }

    if (!isTournamentDay || !isPlayingHours) {
      return NextResponse.json({
        message: 'Outside tournament hours — skipping',
        timestamp: now.toISOString(),
        action: 'skipped',
        activeTournaments: activeTournaments.map((t) => t.name),
      })
    }

    const results = []

    for (const tournament of activeTournaments) {
      try {
        const espnEntries = await getESPNLeaderboard(tournament.espnId)

        if (espnEntries.length === 0) {
          results.push({ tournament: tournament.name, error: 'No ESPN data returned' })
          continue
        }

        const maxRound = Math.max(...espnEntries.map((e) => e.currentRound).filter(Boolean), 1)
        const tournamentCompleted = espnEntries.every((e) => e.thru === 'F' || e.missedCut)

        // Sync golfer records and round scores
        const syncedRounds = new Set<number>()

        for (const entry of espnEntries) {
          const golfer = await db.golfer.upsert({
            where: { espnId: entry.espnPlayerId },
            create: {
              espnId: entry.espnPlayerId,
              firstName: entry.firstName,
              lastName: entry.lastName,
              fullName: entry.fullName,
              photoUrl: entry.photoUrl,
            },
            update: { photoUrl: entry.photoUrl ?? undefined },
          })

          for (const rs of entry.roundScores) {
            const round = tournament.rounds.find((r) => r.roundNumber === rs.round)
            if (!round) continue

            syncedRounds.add(rs.round)

            await db.golfRoundScore.upsert({
              where: { roundId_golferId: { roundId: round.id, golferId: golfer.id } },
              create: {
                roundId: round.id,
                golferId: golfer.id,
                score: rs.score,
                totalScore: entry.totalScore,
                position: entry.position,
                missedCut: entry.missedCut,
              },
              update: {
                score: rs.score,
                totalScore: entry.totalScore,
                position: entry.position,
                missedCut: entry.missedCut,
              },
            })
          }
        }

        // Mark completed rounds and calculate points
        const completedRoundNumbers = Array.from(syncedRounds).filter(
          (rn) => rn < maxRound || tournamentCompleted
        )

        for (const roundNumber of completedRoundNumbers) {
          const round = tournament.rounds.find((r) => r.roundNumber === roundNumber)
          if (!round || round.isCompleted) continue

          await db.golfRound.update({
            where: { id: round.id },
            data: { isCompleted: true, status: 'COMPLETED' },
          })

          await calculateRoundPoints(round.id)

          if (roundNumber === 2) {
            await processRound2Cuts(tournament.id)
          }
        }

        // Update current round to in-progress and score it live
        const currentRound = tournament.rounds.find((r) => r.roundNumber === maxRound)
        if (currentRound && !currentRound.isCompleted) {
          await db.golfRound.update({
            where: { id: currentRound.id },
            data: { status: 'IN_PROGRESS' },
          })
          await calculateRoundPoints(currentRound.id)
        }

        // Complete the tournament if all players are finished
        let finalStatus = tournament.status
        if (tournamentCompleted) {
          finalStatus = 'COMPLETED'
          await db.golfTournament.update({
            where: { id: tournament.id },
            data: { status: 'COMPLETED' },
          })
          await calculateTournamentBonuses(tournament.id)
          await archiveTournamentResults(tournament.id)
          console.log(`⛳ Golf tournament completed and archived: ${tournament.name}`)
        }

        results.push({
          tournament: tournament.name,
          playersSync: espnEntries.length,
          roundsSynced: Array.from(syncedRounds).sort(),
          currentRound: maxRound,
          status: finalStatus,
        })

        console.log(`⛳ Golf sync: ${tournament.name}`, results[results.length - 1])
      } catch (tournamentError) {
        console.error(`Golf sync failed for ${tournament.name}:`, tournamentError)
        results.push({
          tournament: tournament.name,
          error: tournamentError instanceof Error ? tournamentError.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: 'Golf sync completed',
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error('Golf cron sync failed:', error)
    return NextResponse.json(
      {
        error: 'Golf cron sync failed',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Allow manual POST trigger from admin panel
export async function POST(request: NextRequest) {
  return GET(request)
}
