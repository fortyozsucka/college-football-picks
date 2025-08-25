const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function makeTravisAdmin() {
  try {
    const updatedUser = await prisma.user.update({
      where: { email: 'squadtriangle@gmail.com' },
      data: { isAdmin: true }
    })

    console.log('Travis McCrea updated to admin successfully:')
    console.log('Email:', updatedUser.email)
    console.log('Name:', updatedUser.name)
    console.log('Admin Status:', updatedUser.isAdmin)
    console.log('User ID:', updatedUser.id)
    
  } catch (error) {
    console.error('Error updating Travis to admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeTravisAdmin()