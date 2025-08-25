import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Admin endpoint to manage users
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const token = request.cookies.get('auth-token')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        totalScore: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          picks: true
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete user(s)
export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    const token = request.cookies.get('auth-token')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const testUsers = searchParams.get('testUsers') === 'true'

    if (testUsers) {
      // Delete all test users (keep admin users)
      const deletedUsers = await db.user.deleteMany({
        where: {
          OR: [
            { email: { contains: 'test' } },
            { email: { contains: 'example' } },
            { name: { contains: 'Test' } },
            { name: { contains: 'test' } }
          ],
          isAdmin: false // Don't delete admin users even if they contain "test"
        }
      })

      return NextResponse.json({
        message: `Deleted ${deletedUsers.count} test users`,
        deletedCount: deletedUsers.count
      })
    } else if (userId) {
      // Delete specific user
      await db.user.delete({
        where: { id: userId }
      })

      return NextResponse.json({
        message: `User ${userId} deleted successfully`
      })
    } else {
      return NextResponse.json({ error: 'userId or testUsers=true parameter required' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error deleting user(s):', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}