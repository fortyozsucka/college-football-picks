interface ApiCall {
  timestamp: Date
  endpoint: string
  method: string
  responseTime: number
  success: boolean
  error?: string
}

interface ApiStats {
  totalCalls: number
  callsToday: number
  callsThisWeek: number
  callsThisMonth: number
  averageResponseTime: number
  successRate: number
  recentCalls: ApiCall[]
  endpointBreakdown: Record<string, number>
}

class ApiCallTracker {
  private static instance: ApiCallTracker
  private calls: ApiCall[] = []
  private maxStoredCalls = 1000 // Keep last 1000 calls in memory

  private constructor() {
    // Load from localStorage if available (for browser environments)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cfb-api-calls')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          this.calls = data.map((call: any) => ({
            ...call,
            timestamp: new Date(call.timestamp)
          }))
        } catch (e) {
          console.error('Failed to load API call history:', e)
        }
      }
    }
  }

  static getInstance(): ApiCallTracker {
    if (!ApiCallTracker.instance) {
      ApiCallTracker.instance = new ApiCallTracker()
    }
    return ApiCallTracker.instance
  }

  trackCall(endpoint: string, method: string, responseTime: number, success: boolean, error?: string) {
    const call: ApiCall = {
      timestamp: new Date(),
      endpoint,
      method,
      responseTime,
      success,
      error
    }

    this.calls.push(call)
    
    // Keep only the most recent calls
    if (this.calls.length > this.maxStoredCalls) {
      this.calls = this.calls.slice(-this.maxStoredCalls)
    }

    // Save to localStorage if available
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cfb-api-calls', JSON.stringify(this.calls))
      } catch (e) {
        console.error('Failed to save API call history:', e)
      }
    }
  }

  getStats(): ApiStats {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const totalCalls = this.calls.length
    const callsToday = this.calls.filter(call => call.timestamp >= today).length
    const callsThisWeek = this.calls.filter(call => call.timestamp >= weekAgo).length
    const callsThisMonth = this.calls.filter(call => call.timestamp >= monthAgo).length

    const successfulCalls = this.calls.filter(call => call.success)
    const averageResponseTime = totalCalls > 0 
      ? this.calls.reduce((sum, call) => sum + call.responseTime, 0) / totalCalls 
      : 0
    const successRate = totalCalls > 0 ? (successfulCalls.length / totalCalls) * 100 : 100

    // Get endpoint breakdown
    const endpointBreakdown: Record<string, number> = {}
    this.calls.forEach(call => {
      endpointBreakdown[call.endpoint] = (endpointBreakdown[call.endpoint] || 0) + 1
    })

    // Get recent calls (last 50)
    const recentCalls = this.calls.slice(-50).reverse()

    return {
      totalCalls,
      callsToday,
      callsThisWeek,
      callsThisMonth,
      averageResponseTime: Math.round(averageResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      recentCalls,
      endpointBreakdown
    }
  }

  clearHistory() {
    this.calls = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cfb-api-calls')
    }
  }
}

export const apiTracker = ApiCallTracker.getInstance()
export type { ApiStats, ApiCall }