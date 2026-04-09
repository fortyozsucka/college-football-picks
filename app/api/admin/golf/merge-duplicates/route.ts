import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ð/g, 'd').replace(/þ/g, 'th')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

async function mergeInto(keepId: string, dropId: string, label: string, merged: string[]) {
  // Move picks, round scores, odds from drop → keep, then delete drop
  await db.golfPick.updateMany({ where: { golferId: dropId }, data: { golferId: keepId } })
  // Round scores: can't move if keep already has one for the same round (unique constraint)
  // Delete the drop's round scores instead — the sync will repopulate from ESPN
  await db.golfRoundScore.deleteMany({ where: { golferId: dropId } })
  await db.golferTournamentOdds.updateMany({ where: { golferId: dropId }, data: { golferId: keepId } })
  await db.golfer.delete({ where: { id: dropId } })
  merged.push(label)
}

// POST /api/admin/golf/merge-duplicates
// 1. Merges slug placeholder golfers into matching real ESPN records
// 2. Merges duplicate real golfer records (same name, different ESPN IDs) — keeps the
//    record with the most recent round score data (from latest sync), drops the other
export async function POST() {
  try {
    const current = await getCurrentUser()
    if (!current?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allGolfers = await db.golfer.findMany({
      include: {
        roundScores: { orderBy: { id: 'desc' }, take: 1 },
      },
    })

    const merged: string[] = []
    const noMatch: string[] = []

    // ── Step 1: slug → real merges ──────────────────────────────────────────
    const slugGolfers = allGolfers.filter(g => g.espnId.startsWith('slug:'))
    const realGolfers = allGolfers.filter(g => !g.espnId.startsWith('slug:'))
    const realByNorm = new Map(realGolfers.map(g => [normalizeName(g.fullName), g]))

    for (const slug of slugGolfers) {
      const norm = normalizeName(slug.fullName)
      const real = realByNorm.get(norm)
      if (!real) { noMatch.push(slug.fullName); continue }
      await mergeInto(real.id, slug.id, `${slug.fullName} (slug) → ${real.fullName}`, merged)
    }

    // ── Step 2: real → real duplicate merges ────────────────────────────────
    // Re-fetch after step 1 deletions
    const remaining = await db.golfer.findMany({
      where: { espnId: { not: { startsWith: 'slug:' } } },
      include: { roundScores: { orderBy: { id: 'desc' }, take: 1 } },
    })

    // Group by normalized name — find names with more than one record
    const byNorm = new Map<string, typeof remaining>()
    for (const g of remaining) {
      const norm = normalizeName(g.fullName)
      if (!byNorm.has(norm)) byNorm.set(norm, [])
      byNorm.get(norm)!.push(g)
    }

    for (const [, group] of Array.from(byNorm.entries())) {
      if (group.length < 2) continue

      // Keep the record with the most recent round score (most likely from ESPN sync)
      // Fall back to the one with the highest-looking ESPN ID (numeric IDs from ESPN are large)
      const sorted = group.sort((a, b) => {
        const aHasScore = a.roundScores.length > 0
        const bHasScore = b.roundScores.length > 0
        if (aHasScore && !bHasScore) return -1
        if (!aHasScore && bHasScore) return 1
        // Both have scores or neither does — prefer the larger ESPN ID (ESPN IDs are numeric)
        return b.espnId.localeCompare(a.espnId)
      })

      const keep = sorted[0]
      for (const drop of sorted.slice(1)) {
        await mergeInto(keep.id, drop.id, `${drop.fullName} (dup real) → ${keep.fullName}`, merged)
      }
    }

    return NextResponse.json({ merged, noMatch, mergedCount: merged.length })
  } catch (error) {
    console.error('Error merging duplicate golfers:', error)
    return NextResponse.json({ error: 'Failed to merge duplicates' }, { status: 500 })
  }
}
