const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

const tournamentId = 'cmnb0v9vg0005f8udpug26duw'
const rounds = [
  { id: 'cmnb0v9vh0006f8udwglfnhtn', num: 1 },
  { id: 'cmnb0v9vh0007f8udd49o0vax', num: 2 },
  { id: 'cmnb0v9vh0008f8udo3dmvc6y', num: 3 },
  { id: 'cmnb0v9vh0009f8udyw8zu498', num: 4 },
]

async function calculateRoundPoints(roundId, roundNum) {
  const picks = await db.golfPick.findMany({
    where: { tournamentId },
    include: { user: true, golfer: true },
  })

  // Group picks by user
  const byUser = {}
  for (const p of picks) {
    if (!byUser[p.userId]) byUser[p.userId] = []
    byUser[p.userId].push(p)
  }

  for (const [userId, userPicks] of Object.entries(byUser)) {
    // Fetch all scores for this user's golfers this round
    const scores = await db.golfRoundScore.findMany({
      where: { roundId, golferId: { in: userPicks.map(p => p.golferId) } },
    })

    const scoreMap = {}
    for (const s of scores) scoreMap[s.golferId] = s

    // Best score among non-MC golfers
    const validScores = scores.filter(s => !s.missedCut && s.score !== null).map(s => s.score)
    const bestScore = validScores.length > 0 ? Math.min(...validScores) : null

    for (const pick of userPicks) {
      const score = scoreMap[pick.golferId]
      let points = 0

      // Check if user is cut (marked on R3/R4 records)
      const existing = await db.golfPickRoundPoints.findUnique({
        where: { pickId_roundId: { pickId: pick.id, roundId } },
      })
      if (existing?.isUserCut) { continue } // already marked cut, skip

      if (score && score.score !== null && bestScore !== null && !score.missedCut) {
        const behind = score.score - bestScore
        points = Math.max(0, 20 - behind * 2)
      }

      await db.golfPickRoundPoints.upsert({
        where: { pickId_roundId: { pickId: pick.id, roundId } },
        create: { pickId: pick.id, roundId, points, isUserCut: false },
        update: { points },
      })
    }
  }
  console.log(`✓ R${roundNum} points calculated`)
}

async function processRound2Cuts() {
  const picks = await db.golfPick.findMany({ where: { tournamentId } })
  const userIds = [...new Set(picks.map(p => p.userId))]

  if (userIds.length <= 1) {
    console.log('Only 1 user — no cut applied')
    return
  }

  const userTotals = {}
  for (const uid of userIds) {
    userTotals[uid] = 0
    const userPicks = picks.filter(p => p.userId === uid)
    for (const pick of userPicks) {
      for (const r of rounds.slice(0, 2)) {
        const pts = await db.golfPickRoundPoints.findUnique({
          where: { pickId_roundId: { pickId: pick.id, roundId: r.id } },
        })
        userTotals[uid] += pts?.points ?? 0
      }
    }
  }

  console.log('R1+R2 user totals:', userTotals)
  const lowestTotal = Math.min(...Object.values(userTotals))
  const cutUserId = Object.keys(userTotals).find(uid => userTotals[uid] === lowestTotal)

  const cutPicks = picks.filter(p => p.userId === cutUserId)
  for (const pick of cutPicks) {
    for (const r of rounds.slice(2)) {
      await db.golfPickRoundPoints.upsert({
        where: { pickId_roundId: { pickId: pick.id, roundId: r.id } },
        create: { pickId: pick.id, roundId: r.id, points: 0, isUserCut: true },
        update: { points: 0, isUserCut: true },
      })
    }
  }
  console.log(`✓ Cut applied to user ${cutUserId} (total: ${lowestTotal})`)
}

async function calculateBonuses() {
  const bonusMap = { 1: 20, 2: 10, 3: 5 }
  const r4Id = rounds[3].id

  for (const [pos, bonus] of Object.entries(bonusMap)) {
    const scores = await db.golfRoundScore.findMany({
      where: { roundId: r4Id, position: parseInt(pos), missedCut: false },
    })
    for (const score of scores) {
      const matchingPicks = await db.golfPick.findMany({
        where: { tournamentId, golferId: score.golferId },
        include: { golfer: true },
      })
      for (const pick of matchingPicks) {
        await db.golfPickRoundPoints.update({
          where: { pickId_roundId: { pickId: pick.id, roundId: r4Id } },
          data: { points: { increment: bonus } },
        })
        console.log(`✓ +${bonus} bonus → ${pick.golfer.fullName} (pos ${pos})`)
      }
    }
  }
}

async function main() {
  console.log('=== Golf Scoring Simulation ===\n')
  // Clear any existing point records first
  await db.golfPickRoundPoints.deleteMany({ where: { pick: { tournamentId } } })

  await calculateRoundPoints(rounds[0].id, 1)
  await calculateRoundPoints(rounds[1].id, 2)
  await processRound2Cuts()
  await calculateRoundPoints(rounds[2].id, 3)
  await calculateRoundPoints(rounds[3].id, 4)
  await calculateBonuses()

  // Print results
  const allPts = await db.golfPickRoundPoints.findMany({
    include: { pick: { include: { golfer: true, user: true } }, round: true },
    orderBy: [{ round: { roundNumber: 'asc' } }, { points: 'desc' }],
  })

  let lastRound = 0
  for (const r of allPts) {
    if (r.round.roundNumber !== lastRound) {
      lastRound = r.round.roundNumber
      console.log(`\n--- Round ${lastRound} ---`)
    }
    const cutLabel = r.isUserCut ? ' [USER CUT]' : ''
    console.log(`  ${r.pick.golfer.fullName.padEnd(22)} ${String(r.points).padStart(3)} pts${cutLabel}`)
  }

  // Totals
  console.log('\n=== User Totals ===')
  const totals = {}
  for (const r of allPts) {
    const name = r.pick.user.name || r.pick.user.email
    totals[name] = (totals[name] ?? 0) + r.points
  }
  for (const [name, total] of Object.entries(totals)) {
    console.log(`  ${name}: ${total} pts`)
  }

  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
