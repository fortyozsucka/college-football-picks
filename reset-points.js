const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resetPoints() {
  console.log('Resetting all pick points to null...')
  
  const result = await prisma.pick.updateMany({
    where: {
      points: { not: null }
    },
    data: {
      points: null
    }
  })
  
  console.log(`Reset ${result.count} pick points`)
  
  // Also reset user total scores
  const users = await prisma.user.updateMany({
    data: {
      totalScore: 0
    }
  })
  
  console.log(`Reset ${users.count} user total scores`)
  
  await prisma.$disconnect()
}

resetPoints().catch(console.error)