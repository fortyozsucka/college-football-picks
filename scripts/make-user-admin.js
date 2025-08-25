const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function makeUserAdmin() {
  try {
    // Try to find user by email containing 'travismccrea'
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'travismccrea' } },
          { email: 'travismccrea' }
        ]
      }
    })

    if (!user) {
      console.log('User with travismccrea not found. Searching all users...')
      
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true, isAdmin: true }
      })
      
      console.log('All users in database:')
      allUsers.forEach(u => {
        console.log(`- ${u.email} (${u.name}) - Admin: ${u.isAdmin}`)
      })
      
      return
    }

    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true }
    })

    console.log('User updated to admin successfully:')
    console.log('Email:', updatedUser.email)
    console.log('Name:', updatedUser.name)
    console.log('Admin Status:', updatedUser.isAdmin)
    console.log('User ID:', updatedUser.id)
    
  } catch (error) {
    console.error('Error updating user to admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeUserAdmin()