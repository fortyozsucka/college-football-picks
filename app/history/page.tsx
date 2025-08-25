'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HistoricalSeason {
  season: number
  champion: string
  championScore: number
  totalUsers: number
  archivedAt: string
}

interface HistoricalStats {
  season: number
  userId: string
  userName: string
  userEmail: string
  finalScore: number
  totalPicks: number
  correctPicks: number
  winPercentage: number
  doubleDowns: number
  correctDoubleDowns: number
  rank: number
  totalUsers: number
  archivedAt: string
}

interface SeasonDetail {
  season: number
  stats: HistoricalStats[]
  totalUsers: number
  archivedAt: string
}

export default function HistoryPage() {
  const [seasons, setSeasons] = useState<HistoricalSeason[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [seasonDetail, setSeasonDetail] = useState<SeasonDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/historical-stats')
      if (!response.ok) {
        throw new Error('Failed to fetch historical data')
      }
      const data = await response.json()
      setSeasons(data.seasons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchSeasonDetail = async (season: number) => {
    setDetailLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/historical-stats?season=${season}`)
      if (!response.ok) {
        throw new Error('Failed to fetch season details')
      }
      const data = await response.json()
      setSeasonDetail(data)
      setSelectedSeason(season)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading historical data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold">Error loading historical data</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <button 
            onClick={fetchSeasons}
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
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🏆 Historical Leaderboards</h1>
          <p className="text-gray-600 mt-2">Season champions and final standings</p>
        </div>
        {selectedSeason && (
          <button
            onClick={() => {
              setSelectedSeason(null)
              setSeasonDetail(null)
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Seasons
          </button>
        )}
      </div>

      {seasons.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <h3 className="text-yellow-800 font-semibold mb-2">No Historical Data Available</h3>
          <p className="text-yellow-600 mb-4">
            No seasons have been archived yet. Historical data will appear here after an admin archives a completed season.
          </p>
        </div>
      ) : selectedSeason && seasonDetail ? (
        /* Season Detail View */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Season {seasonDetail.season} Final Standings</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {seasonDetail.totalUsers} participants • Archived on {new Date(seasonDetail.archivedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-2xl font-bold text-yellow-600">👑</div>
                <div className="text-sm text-gray-600">Champion</div>
                <div className="font-semibold text-gray-900">{seasonDetail.stats[0]?.userName}</div>
                <div className="text-lg font-bold text-blue-600">{seasonDetail.stats[0]?.finalScore} pts</div>
              </div>
            </div>
          </div>
          
          {detailLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading season details...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Picks</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Win %</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Double Downs</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {seasonDetail.stats.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-lg font-bold ${
                            user.rank === 1 ? 'text-yellow-500' : 
                            user.rank === 2 ? 'text-gray-400' : 
                            user.rank === 3 ? 'text-amber-600' : 'text-gray-600'
                          }`}>
                            {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-lg font-bold text-blue-600">{user.finalScore}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{user.correctPicks}/{user.totalPicks}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className={`text-sm font-medium ${
                          user.winPercentage >= 60 ? 'text-green-600' : 
                          user.winPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {user.winPercentage.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">
                          {user.correctDoubleDowns}/{user.doubleDowns}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Seasons Overview */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {seasons.map((season) => (
            <div
              key={season.season}
              onClick={() => fetchSeasonDetail(season.season)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-300"
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Season {season.season}</h3>
                <div className="text-4xl mb-3">🏆</div>
                <div className="text-lg font-semibold text-blue-600 mb-1">{season.champion}</div>
                <div className="text-2xl font-bold text-gray-900 mb-2">{season.championScore} pts</div>
                <div className="text-sm text-gray-600 mb-3">{season.totalUsers} participants</div>
                <div className="text-xs text-gray-500">
                  Archived {new Date(season.archivedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <span className="text-blue-600 text-sm font-medium hover:text-blue-800">
                    View Full Standings →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}