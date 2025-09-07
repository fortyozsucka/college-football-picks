import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PushNotificationService, NotificationTemplates } from '@/lib/push-notifications'

export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Running notification cron job...')
    
    // Check for authorization (you might want to add a secret key)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      gameStartReminders: 0,
      pickDeadlines: 0,
      errors: [] as string[]
    }

    // 1. Check for games starting in 30 minutes
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000)
    const fortyMinutesFromNow = new Date(Date.now() + 40 * 60 * 1000)
    
    const upcomingGames = await db.game.findMany({
      where: {
        startTime: {
          gte: thirtyMinutesFromNow,
          lte: fortyMinutesFromNow
        },
        completed: false
      }
    })

    console.log(`Found ${upcomingGames.length} games starting soon`)

    for (const game of upcomingGames) {
      try {
        // Find users who haven't made picks for this game and have gameStartReminders enabled
        const usersWithoutPicks = await db.user.findMany({
          where: {
            picks: {
              none: { gameId: game.id }
            },
            notificationPreferences: {
              gameStartReminders: true,
              pushNotifications: true
            }
          },
          include: {
            pushSubscriptions: true
          }
        })

        if (usersWithoutPicks.length > 0) {
          const userIds = usersWithoutPicks.map(u => u.id)
          const minutesUntilStart = Math.round((new Date(game.startTime).getTime() - Date.now()) / (1000 * 60))
          
          const notification = NotificationTemplates.gameStartingSoon(
            game.homeTeam,
            game.awayTeam,
            minutesUntilStart
          )

          const result = await PushNotificationService.sendToUsers(userIds, notification)
          results.gameStartReminders += result.sent || 0
          
          console.log(`Sent game start reminders for ${game.awayTeam} @ ${game.homeTeam} to ${result.sent} users`)
        }
      } catch (error) {
        console.error(`Error sending game start reminder for game ${game.id}:`, error)
        results.errors.push(`Game ${game.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // 2. Check for pick deadlines (2 hours before week deadline)
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const twoAndHalfHoursFromNow = new Date(Date.now() + 2.5 * 60 * 60 * 1000)

    // Find the earliest game in each week that's starting soon
    const weekDeadlines = await db.game.findMany({
      where: {
        startTime: {
          gte: twoHoursFromNow,
          lte: twoAndHalfHoursFromNow
        },
        completed: false
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // Group by week/season
    const weekGroups = weekDeadlines.reduce((acc, game) => {
      const key = `${game.week}-${game.season}`
      if (!acc[key] || new Date(game.startTime) < new Date(acc[key].startTime)) {
        acc[key] = game
      }
      return acc
    }, {} as Record<string, typeof weekDeadlines[0]>)

    for (const [weekKey, earliestGame] of Object.entries(weekGroups)) {
      try {
        const [week, season] = weekKey.split('-').map(Number)
        
        // Find users who haven't made enough picks for this week
        const usersWithIncompletePicks = await db.user.findMany({
          where: {
            notificationPreferences: {
              gameStartReminders: true, // Using this for pick deadline reminders too
              pushNotifications: true
            }
          },
          include: {
            picks: {
              where: {
                game: {
                  week,
                  season,
                  gameType: 'REGULAR' // Only count regular season picks
                }
              }
            },
            pushSubscriptions: true
          }
        })

        const usersNeedingPicks = usersWithIncompletePicks.filter(user => user.picks.length < 5)

        if (usersNeedingPicks.length > 0) {
          const userIds = usersNeedingPicks.map(u => u.id)
          const hoursLeft = Math.round((new Date(earliestGame.startTime).getTime() - Date.now()) / (1000 * 60 * 60))
          
          const notification = NotificationTemplates.pickDeadline(hoursLeft)
          
          const result = await PushNotificationService.sendToUsers(userIds, notification)
          results.pickDeadlines += result.sent || 0
          
          console.log(`Sent pick deadline reminders for Week ${week} to ${result.sent} users`)
        }
      } catch (error) {
        console.error(`Error sending pick deadline reminder for ${weekKey}:`, error)
        results.errors.push(`Week ${weekKey}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log('✅ Notification cron job completed:', results)

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in notification cron job:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}