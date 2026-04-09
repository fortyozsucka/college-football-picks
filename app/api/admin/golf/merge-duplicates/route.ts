import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}

// POST /api/admin/golf/merge-duplicates
// Finds slug placeholder golfers that have a real ESPN match (by normalized name)
// and re-points all picks/scores to the real record, then deletes the slug.
export async function POST() {
  try {
    const current = await getCurrentUser()
    if (!current?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allGolfers = await db.golfer.findMany()
    const slugGolfers = allGolfers.filter(g => g.espnId.startsWith('slug:'))
    const realGolfers = allGolfers.filter(g => !g.espnId.startsWith('slug:'))

    // Build norm → real golfer map
    const realByNorm = new Map(realGolfers.map(g => [normalizeName(g.fullName), g]))

    const merged: string[] = []
    const noMatch: string[] = []

    for (const slug of slugGolfers) {
      const norm = normalizeName(slug.fullName)
      const real = realByNorm.get(norm)

      if (!real) {
        noMatch.push(slug.fullName)
        continue
      }

      // Re-point picks from slug → real golfer
      await db.golfPick.updateMany({
        where: { golferId: slug.id },
        data: { golferId: real.id },
      })

      // Re-point round scores
      await db.golfRoundScore.updateMany({
        where: { golferId: slug.id },
        data: { golferId: real.id },
      })

      // Re-point odds
      await db.golferTournamentOdds.updateMany({
        where: { golferId: slug.id },
        data: { golferId: real.id },
      })

      // Delete the slug record
      await db.golfer.delete({ where: { id: slug.id } })

      merged.push(`${slug.fullName} → ${real.fullName}`)
    }

    return NextResponse.json({ merged, noMatch, mergedCount: merged.length })
  } catch (error) {
    console.error('Error merging duplicate golfers:', error)
    return NextResponse.json({ error: 'Failed to merge duplicates' }, { status: 500 })
  }
}
