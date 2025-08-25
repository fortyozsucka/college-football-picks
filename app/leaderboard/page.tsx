'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'

interface LeaderboardEntry {
  id: string
  name: string
  email: string
  totalScore: number
  totalPicks: number
  wins: number
  losses: number
  pushes: number
  winPercentage: number
  doubleDowns: number
  doubleDownWins: number
  weeklyStats: Array<{
    picks: number
    points: number
    week: number
    season: number
  }>
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      const data = await response.json()
      setLeaderboard(data)
      // Trigger staggered animation
      setTimeout(() => setAnimateIn(true), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getRankSuffix = (rank: number): string => {
    if (rank >= 11 && rank <= 13) return 'th'
    switch (rank % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold">Error loading leaderboard</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🏆 Leaderboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Season standings and statistics</p>
        </div>
        <button 
          onClick={fetchLeaderboard}
          className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium touch-manipulation"
        >
          🔄 Refresh
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <h3 className="text-yellow-800 font-semibold mb-2">No data available</h3>
          <p className="text-yellow-600">
            No completed picks found. Check back after some games have finished!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Leaderboard Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Record
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win %
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Double Downs
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => {
                    const rank = index + 1
                    const isCurrentUser = user && entry.id === user.id
                    
                    return (
                      <tr 
                        key={entry.id} 
                        className={`transition-all duration-300 transform ${
                          animateIn ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                        } ${
                          isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400' : 'hover:bg-gray-50 hover:scale-[1.01]'
                        }`}
                        style={{ 
                          transitionDelay: `${index * 100}ms`,
                          ...(rank <= 3 && { boxShadow: rank === 1 ? '0 4px 20px rgba(255, 215, 0, 0.3)' : rank === 2 ? '0 4px 20px rgba(192, 192, 192, 0.3)' : '0 4px 20px rgba(205, 127, 50, 0.3)' })
                        }}
                      >
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-base sm:text-lg font-semibold transition-all duration-300 ${
                              rank <= 3 
                                ? 'text-transparent bg-clip-text bg-gradient-to-r ' + 
                                  (rank === 1 ? 'from-yellow-400 to-yellow-600 animate-pulse' : 
                                   rank === 2 ? 'from-gray-400 to-gray-600' : 
                                   'from-orange-400 to-orange-600')
                                : 'text-gray-900'
                            }`}>
                              <span className={rank <= 3 ? 'animate-bounce' : ''}>{getMedalEmoji(rank)}</span> {rank}{getRankSuffix(rank)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {entry.name}
                                {isCurrentUser && (
                                  <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs font-semibold rounded-full animate-pulse border border-blue-200">
                                    <span className="hidden sm:inline">👑 You</span>
                                    <span className="sm:hidden">👑</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[120px] sm:max-w-none">{entry.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-base sm:text-lg font-bold text-gray-900">
                            {entry.totalScore > 0 ? '+' : ''}{entry.totalScore}
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {entry.wins}-{entry.losses}
                            {entry.pushes > 0 && `-${entry.pushes}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({entry.totalPicks} picks)
                          </div>
                          <div className="sm:hidden text-xs text-gray-500 mt-1">
                            {entry.winPercentage.toFixed(1)}%
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.winPercentage.toFixed(1)}%
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {entry.doubleDownWins}/{entry.doubleDowns}
                          </div>
                          {entry.doubleDowns > 0 && (
                            <div className="text-xs text-gray-500">
                              {((entry.doubleDownWins / entry.doubleDowns) * 100).toFixed(1)}%
                            </div>
                          )}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setSelectedUser(selectedUser?.id === entry.id ? null : entry)}
                            className="text-blue-600 hover:text-blue-900 active:text-blue-800 text-xs sm:text-sm font-medium px-2 py-1 rounded touch-manipulation"
                          >
                            {selectedUser?.id === entry.id ? (
                              <span>
                                <span className="hidden sm:inline">Hide Details</span>
                                <span className="sm:hidden">Hide</span>
                              </span>
                            ) : (
                              <span>
                                <span className="hidden sm:inline">View Details</span>
                                <span className="sm:hidden">View</span>
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Details Panel */}
          {selectedUser && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  📊 {selectedUser.name}'s Performance
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="sm:hidden text-gray-400 hover:text-gray-600 p-1 rounded-full touch-manipulation"
                >
                  ✕
                </button>
              </div>
              
              {selectedUser.weeklyStats.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">No completed picks yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {selectedUser.weeklyStats.map((week, index) => (
                    <div key={`${week.season}-${week.week}`} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Week {week.week}, {week.season}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Picks:</span>
                          <span className="font-medium">{week.picks}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Points:</span>
                          <span className={`font-bold ${
                            week.points > 0 ? 'text-green-600' : 
                            week.points < 0 ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {week.points > 0 ? '+' : ''}{week.points}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}