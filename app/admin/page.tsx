'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useRouter } from 'next/navigation'
import { ApiStats, ApiCall, apiTracker } from '@/lib/api-tracker'

interface Invite {
  id: string
  code: string
  email: string | null
  usedBy: string | null
  isUsed: boolean
  createdBy: string
  createdAt: string
  expiresAt: string | null
}

interface Week {
  week: number
  season: number
  isActive: boolean
  gameCount: number
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)
  const [weeksLoading, setWeeksLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [newInviteExpiry, setNewInviteExpiry] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'invites' | 'weeks' | 'api' | 'history'>('invites')
  const [autoProgressing, setAutoProgressing] = useState(false)
  const [apiStats, setApiStats] = useState<ApiStats | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [seasonInfo, setSeasonInfo] = useState<{availableSeasons: number[], archivedSeasons: number[]} | null>(null)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (user && !user.isAdmin) {
      router.push('/')
      return
    }
    if (user) {
      fetchInvites()
      fetchWeeks()
      if (activeTab === 'api') {
        fetchApiStats()
      }
    }
  }, [user, router])

  // Load API stats when API tab is selected
  useEffect(() => {
    if (activeTab === 'api' && user?.isAdmin) {
      fetchApiStats()
    }
    if (activeTab === 'history' && user?.isAdmin) {
      fetchSeasonInfo()
    }
  }, [activeTab, user])

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/invites')
      if (!response.ok) {
        throw new Error('Failed to fetch invites')
      }
      const data = await response.json()
      setInvites(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeks = async () => {
    try {
      console.log('Fetching weeks...', { user: user?.isAdmin })
      const response = await fetch('/api/weeks/available')
      console.log('Weeks response:', response.status, response.statusText)
      if (!response.ok) {
        const errorData = await response.text()
        console.error('Weeks error:', errorData)
        throw new Error(`Failed to fetch weeks: ${response.status} - ${errorData}`)
      }
      const data = await response.json()
      console.log('Weeks data:', data)
      setWeeks(data)
    } catch (err) {
      console.error('Fetch weeks error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load weeks')
    } finally {
      setWeeksLoading(false)
    }
  }

  const createInvite = async () => {
    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newInviteEmail || null,
          expiresInDays: newInviteExpiry
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create invite')
      }

      const newInvite = await response.json()
      setInvites([newInvite, ...invites])
      setNewInviteEmail('')
      setNewInviteExpiry(7)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const deleteInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to delete this invite?')) return

    try {
      const response = await fetch(`/api/invites?id=${inviteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete invite')
      }

      setInvites(invites.filter(invite => invite.id !== inviteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invite')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!')
    })
  }

  const toggleWeekActivation = async (week: number, season: number, isActive: boolean) => {
    try {
      const response = await fetch('/api/weeks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week,
          season,
          isActive: !isActive
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update week')
      }

      // Update the local state
      setWeeks(weeks.map(w => 
        w.week === week && w.season === season 
          ? { ...w, isActive: !isActive }
          : w
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update week')
    }
  }

  const triggerAutoProgression = async () => {
    setAutoProgressing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/weeks/auto-progress', {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check week progression')
      }

      const result = await response.json()
      
      if (result.progressed) {
        // Refresh the weeks data if progression happened
        await fetchWeeks()
        alert(`Week progression successful!\n\n${result.log.join('\n')}`)
      } else {
        alert('No week progression needed. Current weeks are either not completed or no next weeks are available.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check week progression')
    } finally {
      setAutoProgressing(false)
    }
  }

  const fetchApiStats = async () => {
    setApiLoading(true)
    try {
      // Get stats directly from client-side tracker
      const stats = apiTracker.getStats()
      setApiStats(stats)
    } catch (err) {
      console.error('Error fetching API stats:', err)
    } finally {
      setApiLoading(false)
    }
  }

  const clearApiHistory = async () => {
    if (!confirm('Are you sure you want to clear all API call history?')) return

    try {
      // Clear history directly from client-side tracker
      apiTracker.clearHistory()
      await fetchApiStats()
      alert('API call history cleared successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear API history')
    }
  }

  const fetchSeasonInfo = async () => {
    try {
      const response = await fetch('/api/admin/archive-season')
      if (response.ok) {
        const info = await response.json()
        setSeasonInfo(info)
      } else {
        console.error('Failed to fetch season info')
      }
    } catch (err) {
      console.error('Error fetching season info:', err)
    }
  }

  const archiveSeason = async (season: number) => {
    if (!confirm(`Are you sure you want to archive season ${season}? This will preserve the final leaderboard permanently and cannot be undone.`)) {
      return
    }

    setArchiving(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/archive-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ season })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to archive season')
      }

      const result = await response.json()
      await fetchSeasonInfo()
      
      alert(`Successfully archived season ${season}!\n\nChampion: ${result.champion}\nUsers archived: ${result.usersArchived}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive season')
    } finally {
      setArchiving(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p>Please log in to access the admin panel.</p>
      </div>
    )
  }

  if (!user.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p>You don't have permission to access the admin panel.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">⚙️ Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage invite codes, user access, and weekly controls</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('invites')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invites'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📧 Invite Codes
          </button>
          <button
            onClick={() => setActiveTab('weeks')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'weeks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📅 Weekly Controls
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 API Monitoring
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🏆 Season Archive
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Invite Codes Tab */}
      {activeTab === 'invites' && (
        <>
          {/* Create Invite Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Invite</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              value={newInviteEmail}
              onChange={(e) => setNewInviteEmail(e.target.value)}
              placeholder="Leave empty for generic invite"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires in (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={newInviteExpiry}
              onChange={(e) => setNewInviteExpiry(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={createInvite}
              disabled={creating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Invite'}
            </button>
          </div>
        </div>
      </div>

      {/* Invites Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Codes</h2>
        </div>
        
        {invites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No invite codes created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invites.map((invite) => {
                  const isExpired = invite.expiresAt && new Date() > new Date(invite.expiresAt)
                  
                  return (
                    <tr key={invite.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {invite.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(invite.code)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Copy to clipboard"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invite.email || (
                          <span className="text-gray-500 italic">Generic</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invite.isUsed 
                            ? 'bg-green-100 text-green-800'
                            : isExpired
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {invite.isUsed ? 'Used' : isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invite.expiresAt 
                          ? new Date(invite.expiresAt).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!invite.isUsed && (
                          <button
                            onClick={() => deleteInvite(invite.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* Weekly Controls Tab */}
      {activeTab === 'weeks' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Weekly Activation Controls</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Control which weeks are active for picking. Weeks automatically progress 24+ hours after all games are completed.
                </p>
              </div>
              <button
                onClick={triggerAutoProgression}
                disabled={autoProgressing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium touch-manipulation"
              >
                {autoProgressing ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Checking...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="mr-2">🔄</span>
                    Check Auto-Progress
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {weeksLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading weeks...</p>
            </div>
          ) : weeks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No games found. Sync some games first to manage weekly activation.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Week
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Season
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Games
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeks.map((week) => (
                    <tr key={`${week.season}-${week.week}`} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Week {week.week}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{week.season}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{week.gameCount} games</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          week.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {week.isActive ? '✅ Active' : '⏸️ Inactive'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleWeekActivation(week.week, week.season, week.isActive)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors touch-manipulation ${
                            week.isActive
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {week.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* API Monitoring Tab */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* API Statistics Overview */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">College Football Data API Usage</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Monitor your API call usage and performance to track tier limits
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchApiStats}
                    disabled={apiLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {apiLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button
                    onClick={clearApiHistory}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>
            
            {apiLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading API statistics...</p>
              </div>
            ) : apiStats ? (
              <div className="p-4 sm:p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-900">{apiStats.callsToday}</div>
                    <div className="text-sm text-blue-700">Today</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">{apiStats.callsThisWeek}</div>
                    <div className="text-sm text-green-700">This Week</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-900">{apiStats.callsThisMonth}</div>
                    <div className="text-sm text-purple-700">This Month</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{apiStats.totalCalls}</div>
                    <div className="text-sm text-gray-700">Total</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-lg font-semibold text-orange-900">{apiStats.averageResponseTime}ms</div>
                    <div className="text-sm text-orange-700">Average Response Time</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="text-lg font-semibold text-emerald-900">{apiStats.successRate}%</div>
                    <div className="text-sm text-emerald-700">Success Rate</div>
                  </div>
                </div>

                {/* Endpoint Breakdown */}
                {Object.keys(apiStats.endpointBreakdown).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Endpoint Usage</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {Object.entries(apiStats.endpointBreakdown).map(([endpoint, count]) => (
                        <div key={endpoint} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                          <span className="font-mono text-sm">{endpoint}</span>
                          <span className="font-semibold text-gray-900">{count} calls</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Calls */}
                {apiStats.recentCalls.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent API Calls</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Timestamp</th>
                            <th className="px-4 py-2 text-left">Endpoint</th>
                            <th className="px-4 py-2 text-left">Response Time</th>
                            <th className="px-4 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {apiStats.recentCalls.slice(0, 20).map((call, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap">
                                {new Date(call.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 font-mono text-xs">
                                {call.endpoint}
                              </td>
                              <td className="px-4 py-2">
                                {call.responseTime}ms
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  call.success
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {call.success ? '✓ Success' : '✗ Failed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No API call data available yet.</p>
                <p className="text-sm mt-1">Data will appear after making CFB API calls.</p>
              </div>
            )}
          </div>

          {/* API Tier Information */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">📋 College Football Data API Tiers</h3>
            <div className="text-sm text-amber-800 space-y-2">
              <div className="flex justify-between"><span className="font-medium">Free Tier:</span> <span>200 calls/hour</span></div>
              <div className="flex justify-between"><span className="font-medium">Patreon ($5):</span> <span>1,000 calls/hour</span></div>
              <div className="flex justify-between"><span className="font-medium">Patreon ($10):</span> <span>5,000 calls/hour</span></div>
              <div className="flex justify-between"><span className="font-medium">Patreon ($20):</span> <span>Unlimited</span></div>
            </div>
            <p className="text-xs text-amber-700 mt-3">
              Monitor your usage above to determine if you need to upgrade tiers. 
              A typical weekly sync uses 3 API calls (games, lines, teams).
            </p>
          </div>
        </div>
      )}

      {/* Season Archive Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Archive Season */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Season Archive Management</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Archive completed seasons to preserve historical leaderboard data permanently
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {seasonInfo ? (
                <div className="space-y-6">
                  {/* Available Seasons to Archive */}
                  {seasonInfo.availableSeasons.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Available for Archiving</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {seasonInfo.availableSeasons.map((season) => (
                          <div key={season} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-900 mb-2">Season {season}</div>
                              <button
                                onClick={() => archiveSeason(season)}
                                disabled={archiving}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                              >
                                {archiving ? 'Archiving...' : 'Archive Season'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Already Archived Seasons */}
                  {seasonInfo.archivedSeasons.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Archived Seasons</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {seasonInfo.archivedSeasons.map((season) => (
                          <div key={season} className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-900">Season {season}</div>
                              <div className="text-sm text-green-700 mt-1">✓ Archived</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No seasons message */}
                  {seasonInfo.availableSeasons.length === 0 && seasonInfo.archivedSeasons.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No season data available for archiving.</p>
                      <p className="text-sm mt-1">Seasons will appear here after games have been synced.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading season information...</p>
                </div>
              )}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">📋 How Season Archiving Works</h3>
            <div className="text-sm text-amber-800 space-y-2">
              <p>• <strong>Archives final standings:</strong> Preserves user rankings, scores, and statistics permanently</p>
              <p>• <strong>Cannot be undone:</strong> Once archived, the historical data is permanent</p>
              <p>• <strong>Prevents duplicates:</strong> Each season can only be archived once</p>
              <p>• <strong>Creates historical record:</strong> Data becomes available in the History page for all users</p>
            </div>
            <div className="mt-4 p-3 bg-amber-100 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Best Practice:</strong> Archive seasons after they are completely finished and all picks have been scored.
                This preserves the final leaderboard state and creates a permanent historical record.
              </p>
            </div>
          </div>

          {/* View Historical Data Link */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View Historical Data</h3>
            <p className="text-sm text-gray-600 mb-4">
              View archived season leaderboards and historical statistics
            </p>
            <a
              href="/history"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              🏆 View Historical Leaderboards
            </a>
          </div>
        </div>
      )}
    </div>
  )
}