import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get all users with their stored totalScore and actual pick points
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        totalScore: true, // Stored/cached total
        picks: {
          select: {
            points: true
          },
          where: {
            points: { not: null }
          }
        }
      }
    })

    const auditResults = users.map(user => {
      // Calculate actual total from individual pick points
      const calculatedTotal = user.picks.reduce((sum, pick) => sum + (pick.points || 0), 0)
      const storedTotal = user.totalScore
      const discrepancy = storedTotal - calculatedTotal

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        storedTotal,
        calculatedTotal,
        discrepancy,
        hasDiscrepancy: discrepancy !== 0,
        totalPicks: user.picks.length
      }
    })

    // Sort by discrepancy (biggest issues first)
    auditResults.sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy))

    const summary = {
      totalUsers: auditResults.length,
      usersWithDiscrepancies: auditResults.filter(u => u.hasDiscrepancy).length,
      totalDiscrepancy: auditResults.reduce((sum, u) => sum + u.discrepancy, 0)
    }

    return NextResponse.json({
      summary,
      users: auditResults
    })

  } catch (error) {
    console.error('Error auditing scores:', error)
    return NextResponse.json({ error: 'Failed to audit scores' }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔧 Starting score synchronization...')

    // Get all users and recalculate their totals from scratch
    const users = await db.user.findMany({
      select: {
        id: true,
        picks: {
          select: { points: true },
          where: { points: { not: null } }
        }
      }
    })

    let updatedUsers = 0

    for (const user of users) {
      const calculatedTotal = user.picks.reduce((sum, pick) => sum + (pick.points || 0), 0)

      await db.user.update({
        where: { id: user.id },
        data: { totalScore: calculatedTotal }
      })

      updatedUsers++
    }

    console.log(`✅ Updated ${updatedUsers} user total scores`)

    return NextResponse.json({
      message: 'Score synchronization completed',
      updatedUsers
    })

  } catch (error) {
    console.error('Error synchronizing scores:', error)
    return NextResponse.json({ error: 'Failed to synchronize scores' }, { status: 500 })
  }
}