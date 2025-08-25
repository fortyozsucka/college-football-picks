'use client'

import { useEffect, useState } from 'react'
import { Game, Pick } from '@/lib/types'
import { useAuth } from '@/lib/context/AuthContext'

interface SyncStatus {
  lastSync: string | null
  lastSyncWeek: string | null
  activeWeeks: Array<{
    week: number
    season: number
    updatedAt: string
  }>
  syncStats: Array<{
    season: number
    week: number
    gameCount: number
    oldestSync: string
    newestSync: string
  }>
}

export default function GamesPage() {
  const { user } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [makingPick, setMakingPick] = useState<string | null>(null)
  const [celebratingPicks, setCelebratingPicks] = useState<Set<string>>(new Set())
  const [justMadePick, setJustMadePick] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  
  // Filter states
  const [teamSearch, setTeamSearch] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [spreadRange, setSpreadRange] = useState({ min: '', max: '' })
  const [gameStatus, setGameStatus] = useState('all')

  const getSpreadWinner = (game: Game): string | null => {
    if (!game.completed || game.homeScore === null || game.awayScore === null) {
      return null
    }
    
    const scoreDiff = game.homeScore - game.awayScore
    const adjustedHomeDiff = scoreDiff + game.spread
    
    if (adjustedHomeDiff > 0) {
      return game.homeTeam
    } else if (adjustedHomeDiff < 0) {
      return game.awayTeam
    } else {
      return 'Push'
    }
  }

  const getSpreadDisplay = (game: Game): string => {
    if (game.spread > 0) {
      return `${game.homeTeam} -${game.spread}`
    } else if (game.spread < 0) {
      return `${game.awayTeam} -${Math.abs(game.spread)}`
    } else {
      return 'Even'
    }
  }

  useEffect(() => {
    fetchGames()
    fetchSyncStatus()
    if (user) {
      fetchPicks()
    }
  }, [user])

  // Filter games whenever filters or games change
  useEffect(() => {
    let filtered = [...games]
    
    // Team search filter
    if (teamSearch.trim()) {
      const searchTerm = teamSearch.toLowerCase()
      filtered = filtered.filter(game => 
        game.homeTeam.toLowerCase().includes(searchTerm) ||
        game.awayTeam.toLowerCase().includes(searchTerm)
      )
    }
    
    // Time filter
    if (selectedTime) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      
      filtered = filtered.filter(game => {
        const gameDate = new Date(game.startTime)
        switch (selectedTime) {
          case 'today':
            return gameDate >= today && gameDate < tomorrow
          case 'tomorrow':
            return gameDate >= tomorrow && gameDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
          case 'week':
            return gameDate >= today && gameDate < nextWeek
          case 'weekend':
            const friday = new Date(today)
            friday.setDate(today.getDate() + (5 - today.getDay() + 7) % 7)
            const monday = new Date(friday)
            monday.setDate(friday.getDate() + 3)
            return gameDate >= friday && gameDate < monday
          default:
            return true
        }
      })
    }
    
    // Spread range filter
    if (spreadRange.min !== '' || spreadRange.max !== '') {
      filtered = filtered.filter(game => {
        const spread = Math.abs(game.spread)
        const min = spreadRange.min === '' ? 0 : parseFloat(spreadRange.min)
        const max = spreadRange.max === '' ? 999 : parseFloat(spreadRange.max)
        return spread >= min && spread <= max
      })
    }
    
    // Game status filter
    if (gameStatus !== 'all') {
      const now = new Date()
      filtered = filtered.filter(game => {
        const gameStarted = now >= new Date(game.startTime)
        switch (gameStatus) {
          case 'upcoming':
            return !gameStarted && !game.completed
          case 'live':
            return gameStarted && !game.completed
          case 'completed':
            return game.completed
          default:
            return true
        }
      })
    }
    
    setFilteredGames(filtered)
  }, [games, teamSearch, selectedTime, spreadRange, gameStatus])

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      if (!response.ok) {
        throw new Error('Failed to fetch games')
      }
      const data = await response.json()
      setGames(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/games/sync-status')
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }
      const data = await response.json()
      setSyncStatus(data)
    } catch (err) {
      console.error('Error fetching sync status:', err)
    }
  }

  const fetchPicks = async () => {
    if (!user) return
    try {
      const response = await fetch('/api/picks')
      if (!response.ok) {
        throw new Error('Failed to fetch picks')
      }
      const data = await response.json()
      setPicks(data.filter((pick: Pick) => pick.userId === user.id))
    } catch (err) {
      console.error('Error fetching picks:', err)
    }
  }

  const syncGames = async () => {
    setSyncing(true)
    setError(null)
    try {
      const response = await fetch('/api/games/sync', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error('Failed to sync games')
      }
      const result = await response.json()
      console.log('Sync result:', result)
      await fetchGames()
      await fetchSyncStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync games')
    } finally {
      setSyncing(false)
    }
  }

  const makePick = async (gameId: string, pickedTeam: string, isDoubleDown: boolean = false) => {
    if (!user) return
    
    setMakingPick(gameId)
    try {
      const game = games.find(g => g.id === gameId)
      if (!game) return

      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          gameId,
          pickedTeam,
          lockedSpread: game.spread,
          isDoubleDown
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Failed to make pick')
        return
      }

      await fetchPicks()
      
      // Trigger celebration animation
      setJustMadePick(gameId)
      setTimeout(() => setJustMadePick(null), 2000)
    } catch (err) {
      console.error('Error making pick:', err)
      alert('Failed to make pick')
    } finally {
      setMakingPick(null)
    }
  }

  const removePick = async (gameId: string) => {
    if (!user) return
    
    setMakingPick(gameId)
    try {
      const response = await fetch(`/api/picks?userId=${user.id}&gameId=${gameId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Failed to remove pick')
        return
      }

      await fetchPicks()
    } catch (err) {
      console.error('Error removing pick:', err)
      alert('Failed to remove pick')
    } finally {
      setMakingPick(null)
    }
  }

  const getWeeklyPicksCount = (week: number, season: number): { count: number, doubleDownUsed: boolean } => {
    const weekPicks = picks.filter(pick => {
      const game = games.find(g => g.id === pick.gameId)
      return game && game.week === week && game.season === season
    })
    return {
      count: weekPicks.length,
      doubleDownUsed: weekPicks.some(pick => pick.isDoubleDown)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl animate-bounce">🏈</span>
            </div>
          </div>
          <p className="mt-6 text-gray-600 animate-pulse">Loading games...</p>
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold">Error loading games</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <button 
            onClick={fetchGames}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Games</h1>
          {user && games.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {(() => {
                // Get current week stats
                const currentWeek = games[0]?.week || 1
                const currentSeason = games[0]?.season || 2025
                const weekStats = getWeeklyPicksCount(currentWeek, currentSeason)
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm sm:text-base">Week {currentWeek} picks: {weekStats.count}/5</span>
                    <div className="flex items-center gap-2 sm:gap-4">
                      {weekStats.doubleDownUsed && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                          Double Down Used
                        </span>
                      )}
                      <span className="text-blue-600 font-medium">Total Score: {user.totalScore}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
          {syncStatus && syncStatus.lastSync && (
            <div className="mt-2 text-xs sm:text-sm text-gray-500">
              Last synced: {new Date(syncStatus.lastSync).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/New_York'
              })} ET {syncStatus.lastSyncWeek && `(${syncStatus.lastSyncWeek})`}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={syncGames}
            disabled={syncing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <span className="flex items-center">
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  Sync CFB Data
                </>
              )}
            </span>
          </button>
          <button 
            onClick={fetchGames}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <span className="flex items-center">
              <span className="mr-2">🔄</span>
              Refresh
            </span>
          </button>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/picks/calculate-points', { method: 'POST' })
                const result = await response.json()
                alert(`Points calculated: ${result.updatedPicks} picks updated`)
                await fetchGames()
                await fetchPicks()
              } catch (err) {
                alert('Failed to calculate points')
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Calculate Points
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team Search */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              🔍 Search Teams
            </label>
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Enter team name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Time Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              📅 Game Time
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Times</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="weekend">This Weekend</option>
              <option value="week">Next 7 Days</option>
            </select>
          </div>

          {/* Spread Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              📊 Spread Range
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={spreadRange.min}
                onChange={(e) => setSpreadRange(prev => ({ ...prev, min: e.target.value }))}
                placeholder="Min"
                step="0.5"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="number"
                value={spreadRange.max}
                onChange={(e) => setSpreadRange(prev => ({ ...prev, max: e.target.value }))}
                placeholder="Max"
                step="0.5"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Game Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              🎮 Status
            </label>
            <select
              value={gameStatus}
              onChange={(e) => setGameStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Games</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Clear */}
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="text-sm text-gray-600">
            Showing {filteredGames.length} of {games.length} games
            {(teamSearch || selectedTime || spreadRange.min || spreadRange.max || gameStatus !== 'all') && (
              <span className="ml-2 text-blue-600 font-medium">
                (filtered)
              </span>
            )}
          </div>
          {(teamSearch || selectedTime || spreadRange.min || spreadRange.max || gameStatus !== 'all') && (
            <button
              onClick={() => {
                setTeamSearch('')
                setSelectedTime('')
                setSpreadRange({ min: '', max: '' })
                setGameStatus('all')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <h3 className="text-yellow-800 font-semibold mb-2">No games available for picking</h3>
          <p className="text-yellow-600 mb-4">
            No games are currently available. This could be because:
          </p>
          <ul className="text-yellow-600 text-left inline-block space-y-1">
            <li>• No weeks are currently activated by an admin</li>
            <li>• No games have been synced yet</li>
            <li>• All available weeks are inactive</li>
          </ul>
          {user && user.isAdmin && (
            <div className="mt-6">
              <p className="text-sm text-yellow-700 mb-3">
                As an admin, you can activate weeks to make games available for picking.
              </p>
              <a
                href="/admin"
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <span className="mr-2">⚙️</span>
                Manage Weekly Controls
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGames.map((game) => {
            const userPick = picks.find(pick => pick.gameId === game.id)
            const gameStarted = new Date() >= new Date(game.startTime)
            const weeklyStats = getWeeklyPicksCount(game.week, game.season)
            const canMakePick = user && !gameStarted && (weeklyStats.count < 5 || userPick)
            const canDoubleDown = canMakePick && (!weeklyStats.doubleDownUsed || (userPick && userPick.isDoubleDown))

            return (
              <div 
                key={game.id} 
                className={`bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm transition-all duration-500 ${
                  justMadePick === game.id 
                    ? 'scale-105 border-green-400 shadow-lg bg-gradient-to-r from-green-50 to-blue-50' 
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        {game.awayTeamLogo && (
                          <img 
                            src={game.awayTeamLogo} 
                            alt={`${game.awayTeam} logo`}
                            className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <span className="text-center sm:text-left">{game.awayTeam}</span>
                      </div>
                      <span className="text-gray-500 text-center sm:text-left">@</span>
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        {game.homeTeamLogo && (
                          <img 
                            src={game.homeTeamLogo} 
                            alt={`${game.homeTeam} logo`}
                            className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <span className="text-center sm:text-left">{game.homeTeam}</span>
                      </div>
                    </h3>
                    
                    {/* Special Game Badge */}
                    {game.gameType !== 'REGULAR' && (
                      <div className="mb-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                        {game.gameType === 'CHAMPIONSHIP' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-sm">
                            🏆 Championship Game • Mandatory Double Down
                          </span>
                        )}
                        {game.gameType === 'BOWL' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-green-700 text-white shadow-sm">
                            🏈 Bowl Game • Must Pick • Mandatory Double Down
                          </span>
                        )}
                        {game.gameType === 'PLAYOFF' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-sm">
                            🔥 Playoff Game • Mandatory Double Down
                          </span>
                        )}
                        {game.gameType === 'ARMY_NAVY' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-sm">
                            ⚔️ Army-Navy Game • Mandatory Double Down
                          </span>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="text-center sm:text-left">Week {game.week}, {game.season}</div>
                      <div className="text-center sm:text-left">Spread: {getSpreadDisplay(game)}</div>
                      <div className="text-center sm:text-left">
                        {new Date(game.startTime).toLocaleDateString('en-US', {
                          timeZone: 'America/New_York'
                        })} at{' '}
                        {new Date(game.startTime).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'America/New_York'
                        })} ET
                      </div>
                      {game.overUnder && (
                        <div className="text-center sm:text-left">O/U: {game.overUnder}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center lg:text-right">
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      game.completed 
                        ? 'bg-green-100 text-green-800' 
                        : gameStarted
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {game.completed ? 'Final' : gameStarted ? 'In Progress' : 'Upcoming'}
                    </div>
                    
                    {game.completed && game.homeScore !== null && game.awayScore !== null && (
                      <div className="mt-2">
                        <div className="text-lg font-semibold text-gray-900">
                          {game.awayTeam}: {game.awayScore}<br />
                          {game.homeTeam}: {game.homeScore}
                        </div>
                        <div className="mt-2 space-y-1">
                          {game.winner && (
                            <div className="text-sm font-medium text-green-600">
                              Winner: {game.winner}
                            </div>
                          )}
                          {(() => {
                            const spreadWinner = getSpreadWinner(game)
                            if (spreadWinner) {
                              return (
                                <div className={`text-sm font-medium ${
                                  spreadWinner === 'Push' 
                                    ? 'text-gray-600' 
                                    : 'text-blue-600'
                                }`}>
                                  ATS: {spreadWinner === 'Push' ? 'Push' : `${spreadWinner} covers`}
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User's Pick Display */}
                {userPick && (
                  <div className={`border-t pt-4 ${
                    game.completed && userPick.points !== null
                      ? userPick.points > 0 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-lg' 
                        : userPick.points < 0
                        ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
                        : 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  } rounded-lg p-3 mx-1 transition-all duration-300`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700">Your Pick: </span>
                        <span className="font-semibold ml-1">{userPick.pickedTeam}</span>
                        {userPick.isDoubleDown && (
                          <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded animate-pulse">
                            ⚡ DOUBLE DOWN
                          </span>
                        )}
                        {game.completed && userPick.points !== null && userPick.points > 0 && (
                          <span className="ml-2 text-yellow-500 animate-bounce">🎉</span>
                        )}
                      </div>
                      {game.completed && userPick.points !== null && (
                        <div className={`text-sm font-bold flex items-center ${
                          userPick.points > 0 
                            ? 'text-green-600' 
                            : userPick.points < 0 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                        }`}>
                          {userPick.points > 0 && <span className="mr-1">🏆</span>}
                          {userPick.points > 0 ? '+' : ''}{userPick.points} pts
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Picking Interface */}
                {user && !gameStarted && (
                  <div className="border-t pt-4">
                    {weeklyStats.count >= 5 && !userPick ? (
                      <div className="text-center text-sm text-gray-500 italic">
                        You've made all 5 picks for Week {game.week}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs sm:text-sm text-gray-600 text-center px-2">
                          {userPick ? 
                            `Change your pick (${weeklyStats.count}/5 used this week)` : 
                            `Make your pick (${weeklyStats.count}/5 used this week)`
                          }
                        </div>
                        {/* Special game logic - force double down */}
                        {game.gameType !== 'REGULAR' ? (
                          <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
                            <button
                              onClick={() => makePick(game.id, game.awayTeam, true)}
                              disabled={makingPick === game.id}
                              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                                makingPick === game.id 
                                  ? 'animate-pulse bg-gray-600 text-white'
                                  : userPick && userPick.pickedTeam === game.awayTeam
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg'
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              }`}
                            >
                              {makingPick === game.id && userPick?.pickedTeam === game.awayTeam ? (
                                <span className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Processing...
                                </span>
                              ) : (
                                <>
                                  {userPick && userPick.pickedTeam === game.awayTeam ? '⭐ ' : '⚡ '}
                                  Double Down {game.awayTeam}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => makePick(game.id, game.homeTeam, true)}
                              disabled={makingPick === game.id}
                              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                                makingPick === game.id 
                                  ? 'animate-pulse bg-gray-600 text-white'
                                  : userPick && userPick.pickedTeam === game.homeTeam
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg'
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              }`}
                            >
                              {makingPick === game.id && userPick?.pickedTeam === game.homeTeam ? (
                                <span className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Processing...
                                </span>
                              ) : (
                                <>
                                  {userPick && userPick.pickedTeam === game.homeTeam ? '⭐ ' : '⚡ '}
                                  Double Down {game.homeTeam}
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          /* Regular game logic */
                          <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
                            <button
                              onClick={() => makePick(game.id, game.awayTeam, false)}
                              disabled={makingPick === game.id}
                              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                                makingPick === game.id 
                                  ? 'animate-pulse bg-gray-600 text-white'
                                  : userPick && userPick.pickedTeam === game.awayTeam && !userPick.isDoubleDown
                                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                              }`}
                            >
                              {makingPick === game.id && userPick?.pickedTeam === game.awayTeam ? (
                                <span className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Processing...
                                </span>
                              ) : (
                                <>
                                  {userPick && userPick.pickedTeam === game.awayTeam && !userPick.isDoubleDown ? '✓ ' : ''}
                                  Pick {game.awayTeam}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => makePick(game.id, game.homeTeam, false)}
                              disabled={makingPick === game.id}
                              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                                makingPick === game.id 
                                  ? 'animate-pulse bg-gray-600 text-white'
                                  : userPick && userPick.pickedTeam === game.homeTeam && !userPick.isDoubleDown
                                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                              }`}
                            >
                              {makingPick === game.id && userPick?.pickedTeam === game.homeTeam ? (
                                <span className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Processing...
                                </span>
                              ) : (
                                <>
                                  {userPick && userPick.pickedTeam === game.homeTeam && !userPick.isDoubleDown ? '✓ ' : ''}
                                  Pick {game.homeTeam}
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        {canDoubleDown && game.gameType === 'REGULAR' && (
                          <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
                            <button
                              onClick={() => makePick(game.id, game.awayTeam, true)}
                              disabled={makingPick === game.id}
                              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                                userPick && userPick.pickedTeam === game.awayTeam && userPick.isDoubleDown
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg'
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              }`}
                            >
                              {userPick && userPick.pickedTeam === game.awayTeam && userPick.isDoubleDown ? '⭐ ' : '⚡ '}
                              Double Down {game.awayTeam}
                            </button>
                            <button
                              onClick={() => makePick(game.id, game.homeTeam, true)}
                              disabled={makingPick === game.id}
                              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                                userPick && userPick.pickedTeam === game.homeTeam && userPick.isDoubleDown
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg'
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              }`}
                            >
                              {userPick && userPick.pickedTeam === game.homeTeam && userPick.isDoubleDown ? '⭐ ' : '⚡ '}
                              Double Down {game.homeTeam}
                            </button>
                          </div>
                        )}
                        {userPick && (
                          <div className="flex justify-center mt-3">
                            <button
                              onClick={() => removePick(game.id)}
                              disabled={makingPick === game.id}
                              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation"
                            >
                              🗑️ Remove Pick
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!user && !game.completed && !gameStarted && (
                  <div className="border-t pt-4 text-center text-sm text-gray-500 italic">
                    Login to make picks
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}