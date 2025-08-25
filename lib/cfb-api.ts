import { CFBGame, CFBLine } from './types'
import { apiTracker } from './api-tracker'

const CFB_API_BASE = 'https://api.collegefootballdata.com'

export class CFBAPIClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async fetchFromAPI(endpoint: string): Promise<any> {
    const startTime = Date.now()
    let success = false
    let error: string | undefined

    try {
      const response = await fetch(`${CFB_API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        error = `CFB API error: ${response.statusText}`
        apiTracker.trackCall(endpoint, 'GET', responseTime, false, error)
        throw new Error(error)
      }

      success = true
      const data = await response.json()
      apiTracker.trackCall(endpoint, 'GET', responseTime, true)
      
      return data
    } catch (e) {
      const responseTime = Date.now() - startTime
      if (!success) {
        error = e instanceof Error ? e.message : 'Unknown error'
        apiTracker.trackCall(endpoint, 'GET', responseTime, false, error)
      }
      throw e
    }
  }

  async getGames(year: number, week: number): Promise<CFBGame[]> {
    return this.fetchFromAPI(`/games?year=${year}&week=${week}&seasonType=regular&classification=fbs`)
  }

  async getLines(year: number, week: number): Promise<CFBLine[]> {
    return this.fetchFromAPI(`/lines?year=${year}&week=${week}&seasonType=regular&classification=fbs`)
  }

  async getCurrentWeek(year: number): Promise<number> {
    const calendar = await this.fetchFromAPI(`/calendar?year=${year}`)
    const now = new Date()
    
    for (const week of calendar) {
      const startDate = new Date(week.firstGameStart)
      const endDate = new Date(week.lastGameStart)
      endDate.setDate(endDate.getDate() + 7) // Add a week buffer
      
      if (now >= startDate && now <= endDate) {
        return week.week
      }
    }
    
    return 1 // Default to week 1 if not found
  }

  async getTeams(): Promise<any[]> {
    return this.fetchFromAPI('/teams/fbs')
  }
}

export const cfbApi = new CFBAPIClient(process.env.CFB_API_KEY!)