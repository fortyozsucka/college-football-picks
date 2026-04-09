import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/context/AuthContext'

export interface SideBet {
  id: string
  gameId: string
  proposerId: string
  betType: 'SPREAD' | 'OVER_UNDER'
  betSide: string
  customLine: number | null
  amount: number
  note: string | null
  allowMultiple: boolean
  maxAcceptors: number | null
  status: 'OPEN' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED'
  winningSide: string | null
  isResolved: boolean
  createdAt: string
  game: {
    homeTeam: string
    awayTeam: string
    spread: number
    overUnder: number | null
    startTime: string
    completed: boolean
    homeScore: number | null
    awayScore: number | null
  }
  proposer: {
    id: string
    name: string | null
    venmoHandle: string | null
  }
  acceptances: Array<{
    id: string
    acceptorId: string
    isWinner: boolean | null
    isPaid: boolean
    acceptor: {
      id: string
      name: string | null
      venmoHandle: string | null
    }
  }>
}

export interface SideBetStats {
  totalBets: number
  wins: number
  losses: number
  winPercentage: number
  totalWinnings: number
  totalLosses: number
  netWinnings: number
}

export function useSideBets() {
  const { user } = useAuth()
  const [sideBets, setSideBets] = useState<SideBet[]>([])
  const [userStats, setUserStats] = useState<SideBetStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch side bets for a specific game
  const fetchGameSideBets = useCallback(async (gameId: string) => {
    if (!user) return []

    try {
      const response = await fetch(`/api/sidebets?gameId=${gameId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch side bets')
      }
      const bets = await response.json()
      return bets
    } catch (err) {
      console.error('Error fetching game side bets:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return []
    }
  }, [user])

  // Fetch user's side bets
  const fetchUserSideBets = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sidebets?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user side bets')
      }
      const bets = await response.json()
      setSideBets(bets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Create a new side bet
  const createSideBet = useCallback(async (betData: {
    gameId: string
    betType: 'SPREAD' | 'OVER_UNDER'
    betSide: string
    customLine?: number
    amount: number
    note?: string
    allowMultiple?: boolean
    maxAcceptors?: number
  }) => {
    if (!user) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sidebets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(betData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create side bet')
      }

      const newBet = await response.json()
      return newBet
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Accept a side bet
  const acceptSideBet = useCallback(async (sideBetId: string) => {
    if (!user) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sidebets/${sideBetId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to accept side bet')
      }

      const acceptance = await response.json()
      return acceptance
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Cancel a side bet (proposer only)
  const cancelSideBet = useCallback(async (sideBetId: string) => {
    if (!user) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sidebets/${sideBetId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel side bet')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Withdraw acceptance (before game starts)
  const withdrawAcceptance = useCallback(async (sideBetId: string) => {
    if (!user) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sidebets/${sideBetId}/accept`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to withdraw acceptance')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Mark bet as paid
  const markAsPaid = useCallback(async (sideBetId: string, acceptanceId: string) => {
    if (!user) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sidebets/${sideBetId}/paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ acceptanceId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as paid')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch user side bet statistics
  const fetchUserStats = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/users/${user.id}/sidebet-stats`)
      if (response.ok) {
        const stats = await response.json()
        setUserStats(stats)
      }
    } catch (err) {
      console.error('Error fetching user side bet stats:', err)
    }
  }, [user])

  // Helper function to format bet description
  const formatBetDescription = useCallback((sideBet: SideBet) => {
    const { betType, betSide, customLine, game } = sideBet
    
    if (betType === 'SPREAD') {
      const line = customLine !== null ? customLine : game.spread
      const team = betSide === 'HOME' ? game.homeTeam : game.awayTeam
      const formattedLine = line > 0 ? `+${line}` : line.toString()
      return `${team} ${formattedLine}`
    } else {
      const line = customLine !== null ? customLine : game.overUnder
      return `${betSide} ${line}`
    }
  }, [])

  // Helper function to format what the acceptor would be betting on (opposite side)
  const formatAcceptorSide = useCallback((sideBet: SideBet) => {
    const { betType, betSide, customLine, game } = sideBet
    
    if (betType === 'SPREAD') {
      const line = customLine !== null ? customLine : game.spread
      // Opposite team and opposite line
      const team = betSide === 'HOME' ? game.awayTeam : game.homeTeam
      const oppositeLine = -line
      const formattedLine = oppositeLine > 0 ? `+${oppositeLine}` : oppositeLine.toString()
      return `${team} ${formattedLine}`
    } else {
      const line = customLine !== null ? customLine : game.overUnder
      const oppositeSide = betSide === 'OVER' ? 'UNDER' : 'OVER'
      return `${oppositeSide} ${line}`
    }
  }, [])

  // Helper function to format full bet display showing both sides
  const formatFullBetDescription = useCallback((sideBet: SideBet) => {
    const proposerSide = formatBetDescription(sideBet)
    const acceptorSide = formatAcceptorSide(sideBet)
    return {
      proposer: proposerSide,
      acceptor: acceptorSide
    }
  }, [formatBetDescription, formatAcceptorSide])

  // Helper function to determine if user can accept a bet
  const canAcceptBet = useCallback((sideBet: SideBet) => {
    if (!user) return false
    if (sideBet.proposerId === user.id) return false
    if (sideBet.status !== 'OPEN') return false
    if (new Date() >= new Date(sideBet.game.startTime)) return false
    
    const userHasAccepted = sideBet.acceptances.some(a => a.acceptorId === user.id)
    if (userHasAccepted) return false
    
    if (!sideBet.allowMultiple && sideBet.acceptances.length > 0) return false
    if (sideBet.maxAcceptors && sideBet.acceptances.length >= sideBet.maxAcceptors) return false
    
    return true
  }, [user])

  return {
    sideBets,
    userStats,
    isLoading,
    error,
    fetchGameSideBets,
    fetchUserSideBets,
    createSideBet,
    acceptSideBet,
    cancelSideBet,
    withdrawAcceptance,
    markAsPaid,
    fetchUserStats,
    formatBetDescription,
    formatAcceptorSide,
    formatFullBetDescription,
    canAcceptBet
  }
}