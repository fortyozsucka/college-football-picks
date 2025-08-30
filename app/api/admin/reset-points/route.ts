import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    console.log('Starting points reset...')

    // Reset all pick points to null
    const picksResult = await db.pick.updateMany({
      where: {
        points: { not: null }
      },
      data: {
        points: null
      }
    })

    console.log(`Reset ${picksResult.count} pick points`)

    // Reset all user total scores
    const usersResult = await db.user.updateMany({
      data: {
        totalScore: 0
      }
    })

    console.log(`Reset ${usersResult.count} user total scores`)

    return NextResponse.json({
      message: 'Points reset successfully',
      picksReset: picksResult.count,
      usersReset: usersResult.count
    })

  } catch (error) {
    console.error('Error resetting points:', error)
    return NextResponse.json(
      { error: 'Failed to reset points' },
      { status: 500 }
    )
  }
}