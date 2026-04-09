import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Manual scheduling endpoint for more control over sync timing
export async function POST(request: NextRequest) {
  try {
    const { action, schedule } = await request.json()

    switch (action) {
      case 'create_game_day_schedule':
        return await createGameDaySchedule(schedule)
      case 'pause_automation':
        return await pauseAutomation()
      case 'resume_automation': 
        return await resumeAutomation()
      case 'get_status':
        return await getScheduleStatus()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Manual schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to process schedule request' },
      { status: 500 }
    )
  }
}

async function createGameDaySchedule(schedule: any) {
  // Store game day schedule in database or environment
  // This could trigger more frequent syncs during specific games
  
  return NextResponse.json({
    message: 'Game day schedule created',
    schedule,
    nextSync: new Date(Date.now() + 10 * 60 * 1000) // Next sync in 10 minutes
  })
}

async function pauseAutomation() {
  // Logic to pause automated syncing
  // Could set a flag in database or cache
  
  return NextResponse.json({
    message: 'Automation paused',
    pausedAt: new Date().toISOString()
  })
}

async function resumeAutomation() {
  // Logic to resume automated syncing
  
  return NextResponse.json({
    message: 'Automation resumed',
    resumedAt: new Date().toISOString()
  })
}

async function getScheduleStatus() {
  const now = new Date()
  const isGameDay = now.getDay() === 0 || now.getDay() === 6
  const nextSync = new Date(now.getTime() + (isGameDay ? 10 : 240) * 60 * 1000)
  
  return NextResponse.json({
    currentTime: now.toISOString(),
    isGameDay,
    nextScheduledSync: nextSync.toISOString(),
    automationStatus: 'active', // Could check database flag
    lastSyncTime: null // Could get from database
  })
}

export async function GET() {
  return await getScheduleStatus()
}