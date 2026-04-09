const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = 'admin@test.com'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 12)

    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Admin User',
        isAdmin: true,
        totalScore: 0
      }
    })

    console.log('Admin user created successfully:')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('User ID:', admin.id)
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Admin user already exists, updating to admin status...')
      
      const admin = await prisma.user.update({
        where: { email: 'admin@test.com' },
        data: { isAdmin: true }
      })
      
      console.log('User updated to admin successfully:', admin.id)
    } else {
      console.error('Error creating admin user:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()