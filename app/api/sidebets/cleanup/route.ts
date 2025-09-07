import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { SideBetService } from '@/lib/sidebets'

// POST /api/sidebets/cleanup - Cancel expired side bets
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    // Only authenticated users can trigger cleanup (could restrict to admin only if needed)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🧹 Side bet cleanup requested by user: ${user.id}`)
    
    const result = await SideBetService.cancelExpiredSideBets()
    
    return NextResponse.json({
      success: true,
      cancelled: result.cancelled,
      message: `Cancelled ${result.cancelled} expired side bets`
    })
  } catch (error) {
    console.error('Error in side bet cleanup:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cancel expired side bets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/sidebets/cleanup - Get cleanup info
export async function GET() {
  return NextResponse.json({
    message: 'Side bet cleanup endpoint',
    usage: 'POST to this endpoint to cancel all expired side bets (side bets for games that have already started)',
    note: 'This is automatically called during game sync, but can be triggered manually if needed'
  })
}