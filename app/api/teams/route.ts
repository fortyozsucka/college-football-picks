import { NextResponse } from 'next/server'
import { cfbApi } from '@/lib/cfb-api'

export async function GET() {
  try {
    const teams = await cfbApi.getTeams()
    
    // Return just the first few teams for testing
    return NextResponse.json({
      message: 'Sample teams data',
      sampleCount: Math.min(3, teams.length),
      totalTeams: teams.length,
      sampleTeams: teams.slice(0, 3)
    })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}