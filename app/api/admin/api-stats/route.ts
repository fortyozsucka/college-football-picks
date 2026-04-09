import { NextResponse } from 'next/server'
import { apiTracker } from '@/lib/api-tracker'

export async function GET(request: Request) {
  try {
    // Get user from session/token (you may need to adapt this to your auth system)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // For now, we'll skip user validation since this is an admin endpoint
    // In production, you should validate that the user is an admin

    // Return empty stats for now since the tracker runs client-side
    // In a production setup, you'd want to store this data server-side
    const stats = {
      totalCalls: 0,
      callsToday: 0,
      callsThisWeek: 0,
      callsThisMonth: 0,
      averageResponseTime: 0,
      successRate: 100,
      recentCalls: [],
      endpointBreakdown: {}
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching API stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API statistics' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    // Clear API call history
    apiTracker.clearHistory()
    
    return NextResponse.json({ 
      message: 'API call history cleared successfully' 
    })
  } catch (error) {
    console.error('Error clearing API stats:', error)
    return NextResponse.json(
      { error: 'Failed to clear API statistics' },
      { status: 500 }
    )
  }
}