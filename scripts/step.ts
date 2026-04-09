import { calculateRoundPoints, processRound2Cuts, calculateTournamentBonuses, archiveTournamentResults } from '../lib/golf-scoring'
import { db } from '../lib/db'

const T = 'cmnb0v9vg0005f8udpug26duw'
const R = {
  1: 'cmnb0v9vh0006f8udwglfnhtn',
  2: 'cmnb0v9vh0007f8udd49o0vax',
  3: 'cmnb0v9vh0008f8udo3dmvc6y',
  4: 'cmnb0v9vh0009f8udyw8zu498',
}

const step = process.argv[2]

async function main() {
  switch (step) {
    case 'r1-live':
      await calculateRoundPoints(R[1])
      console.log('✓ R1 live points calculated')
      break

    case 'r1-complete':
      await db.golfRound.update({ where: { id: R[1] }, data: { status: 'COMPLETED', isCompleted: true } })
      await calculateRoundPoints(R[1])
      await db.golfRound.update({ where: { id: R[2] }, data: { status: 'IN_PROGRESS' } })
      console.log('✓ R1 complete, R2 now in progress')
      break

    case 'r2-live':
      await db.golfRoundScore.createMany({
        skipDuplicates: true,
        data: [
          { id: crypto.randomUUID(), roundId: R[2], golferId: 'cmnn7r5vu009ywgbwyqjvw94a', score: -3, totalScore: -7,  position: 1,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[2], golferId: 'cmnn7r5pc007lwgbwv0v4qvcj', score: -4, totalScore: -6,  position: 2,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[2], golferId: 'cmnn7r5sn008awgbwusvwcdfp', score: -2, totalScore: -3,  position: 8,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[2], golferId: 'cmnn7r5vn009pwgbw8zvc28pq', score: -1, totalScore:  0,  position: 30, missedCut: false },
          { id: crypto.randomUUID(), roundId: R[2], golferId: 'cmnn7r5r2007uwgbwl7atas52', score:  1, totalScore:  3,  position: 60, missedCut: true  },
          { id: crypto.randomUUID(), roundId: R[2], golferId: 'cmnn7r5sk0085wgbwp2u4yjsk', score: -2, totalScore: -2,  position: 15, missedCut: false },
        ],
      })
      await calculateRoundPoints(R[2])
      console.log('✓ R2 live points calculated (Clark MC\'d)')
      break

    case 'r2-complete':
      await db.golfRound.update({ where: { id: R[2] }, data: { status: 'COMPLETED', isCompleted: true } })
      await calculateRoundPoints(R[2])
      const cut = await processRound2Cuts(T)
      console.log('✓ R2 complete. Cut users:', cut.length ? cut : 'none (1 user)')
      await db.golfRound.update({ where: { id: R[3] }, data: { status: 'IN_PROGRESS' } })
      break

    case 'r3-live':
      await db.golfRoundScore.createMany({
        skipDuplicates: true,
        data: [
          { id: crypto.randomUUID(), roundId: R[3], golferId: 'cmnn7r5vu009ywgbwyqjvw94a', score: -5, totalScore: -12, position: 1,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[3], golferId: 'cmnn7r5pc007lwgbwv0v4qvcj', score: -1, totalScore: -7,  position: 4,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[3], golferId: 'cmnn7r5sn008awgbwusvwcdfp', score: -2, totalScore: -5,  position: 8,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[3], golferId: 'cmnn7r5vn009pwgbw8zvc28pq', score:  0, totalScore:  0,  position: 30, missedCut: false },
          { id: crypto.randomUUID(), roundId: R[3], golferId: 'cmnn7r5sk0085wgbwp2u4yjsk', score: -1, totalScore: -3,  position: 18, missedCut: false },
        ],
      })
      await calculateRoundPoints(R[3])
      console.log('✓ R3 live points calculated')
      break

    case 'r3-complete':
      await db.golfRound.update({ where: { id: R[3] }, data: { status: 'COMPLETED', isCompleted: true } })
      await calculateRoundPoints(R[3])
      await db.golfRound.update({ where: { id: R[4] }, data: { status: 'IN_PROGRESS' } })
      console.log('✓ R3 complete, R4 now in progress')
      break

    case 'r4-live':
      await db.golfRoundScore.createMany({
        skipDuplicates: true,
        data: [
          { id: crypto.randomUUID(), roundId: R[4], golferId: 'cmnn7r5vu009ywgbwyqjvw94a', score: -4, totalScore: -16, position: 1,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[4], golferId: 'cmnn7r5pc007lwgbwv0v4qvcj', score: -3, totalScore: -10, position: 3,  missedCut: false },
          { id: crypto.randomUUID(), roundId: R[4], golferId: 'cmnn7r5sn008awgbwusvwcdfp', score: -1, totalScore: -6,  position: 10, missedCut: false },
          { id: crypto.randomUUID(), roundId: R[4], golferId: 'cmnn7r5vn009pwgbw8zvc28pq', score:  2, totalScore:  2,  position: 35, missedCut: false },
          { id: crypto.randomUUID(), roundId: R[4], golferId: 'cmnn7r5sk0085wgbwp2u4yjsk', score: -2, totalScore: -5,  position: 12, missedCut: false },
        ],
      })
      await calculateRoundPoints(R[4])
      console.log('✓ R4 live points calculated')
      break

    case 'r4-complete':
      await db.golfRound.update({ where: { id: R[4] }, data: { status: 'COMPLETED', isCompleted: true } })
      await db.golfTournament.update({ where: { id: T }, data: { status: 'COMPLETED' } })
      await calculateRoundPoints(R[4])
      await calculateTournamentBonuses(T)
      await archiveTournamentResults(T)
      console.log('✓ R4 complete — bonuses applied, results archived, tournament COMPLETED')
      break

    default:
      console.log('Usage: npx tsx scripts/step.ts <step>')
      console.log('Steps: r1-live, r1-complete, r2-live, r2-complete, r3-live, r3-complete, r4-live, r4-complete')
  }
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
