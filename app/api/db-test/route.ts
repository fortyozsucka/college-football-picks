import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test basic database connection
    const result = await db.$executeRaw`SELECT 1 as test`
    
    // Test if User table exists and count records
    const userCount = await db.user.count()
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection working',
      userCount,
      rawQuery: result
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        error: 'Database error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}