'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/context/AuthContext'
import { Game, Pick } from '@/lib/types'

export default function PicksPage() {
  const { user } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingPick, setRemovingPick] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      const [gamesResponse, picksResponse] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/picks')
      ])

      if (!gamesResponse.ok || !picksResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const gamesData = await gamesResponse.json()
      const picksData = await picksResponse.json()

      setGames(gamesData)
      setPicks(picksData.filter((pick: Pick) => pick.userId === user?.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const removePick = async (gameId: string, pickId: string) => {
    if (!user) return
    
    setRemovingPick(pickId)
    try {
      const response = await fetch(`/api/picks?userId=${user.id}&gameId=${gameId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Failed to remove pick')
        return
      }

      // Refresh the picks after successful removal
      await fetchData()
    } catch (err) {
      console.error('Error removing pick:', err)
      alert('Failed to remove pick')
    } finally {
      setRemovingPick(null)
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Picks</h1>
          {user && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Score</p>
              <p className="text-2xl font-bold text-blue-600">{user.totalScore}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your picks...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold">Error loading picks</h3>
            <p className="text-red-600 mt-2">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {picks.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                <h3 className="text-blue-800 font-semibold mb-2">No picks yet</h3>
                <p className="text-blue-600 mb-4">
                  You haven&apos;t made any picks yet. Check out the games and start making your predictions!
                </p>
                <a 
                  href="/games"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                >
                  View Games
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 font-semibold">
                    You have made {picks.length} pick{picks.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {picks.map((pick) => {
                  const game = games.find(g => g.id === pick.gameId)
                  if (!game) return null

                  const gameStarted = new Date() >= new Date(game.startTime)

                  return (
                    <div key={pick.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {game.awayTeam} @ {game.homeTeam}
                          </h3>
                          
                          {/* Special Game Badge */}
                          {game.gameType !== 'REGULAR' && (
                            <div className="mb-3">
                              {game.gameType === 'CHAMPIONSHIP' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-sm">
                                  🏆 Championship Game
                                </span>
                              )}
                              {game.gameType === 'BOWL' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-green-700 text-white shadow-sm">
                                  🏈 Bowl Game
                                </span>
                              )}
                              {game.gameType === 'PLAYOFF' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-sm">
                                  🔥 Playoff Game
                                </span>
                              )}
                              {game.gameType === 'ARMY_NAVY' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-sm">
                                  ⚔️ Army-Navy Game
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>Week {game.week}, {game.season}</div>
                            <div>Spread: {game.spread > 0 ? '+' : ''}{game.spread}</div>
                            <div>
                              {new Date(game.startTime).toLocaleDateString()} at{' '}
                              {new Date(game.startTime).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            <div>Your pick: <strong>{pick.pickedTeam}</strong></div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            game.completed 
                              ? pick.points !== null
                                ? pick.points > 0 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {game.completed 
                              ? pick.points !== null
                                ? pick.points > 0 ? `+${pick.points} pts` : `${pick.points} pts`
                                : 'Pending'
                              : 'Active'
                            }
                          </div>
                          
                          {pick.isDoubleDown && (
                            <div className="mt-1 text-xs text-orange-600 font-semibold">
                              DOUBLE DOWN
                            </div>
                          )}
                          
                          {game.completed && game.winner && (
                            <div className="mt-2 text-sm">
                              <div className="font-medium text-gray-900">Winner: {game.winner}</div>
                              {game.homeScore !== null && game.awayScore !== null && (
                                <div className="text-gray-600">
                                  {game.awayScore} - {game.homeScore}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {!gameStarted && (
                            <div className="mt-3">
                              <button
                                onClick={() => removePick(game.id, pick.id)}
                                disabled={removingPick === pick.id}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs transition-colors"
                              >
                                {removingPick === pick.id ? 'Removing...' : 'Remove Pick'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}