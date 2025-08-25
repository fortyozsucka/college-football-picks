'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { useState } from 'react'

export default function Navigation() {
  const { user, logout, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <span className="text-lg sm:text-xl font-bold text-gray-900">
                  <span className="hidden sm:inline">🏈 Squad College Football Picks</span>
                  <span className="sm:hidden">🏈 Squad CFB</span>
                </span>
              </Link>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-4 sm:mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-lg sm:text-xl font-bold text-gray-900">
                <span className="hidden sm:inline">🏈 Squad College Football Picks</span>
                <span className="sm:hidden">🏈 Squad CFB</span>
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link 
              href="/" 
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/games" 
              className="text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Games
            </Link>
            <Link 
              href="/leaderboard" 
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              Leaderboard
            </Link>
            <Link 
              href="/history" 
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              History
            </Link>
            
            {user ? (
              <>
                <Link 
                  href="/picks" 
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  My Picks
                </Link>
                {user.isAdmin && (
                  <Link 
                    href="/admin" 
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 hidden lg:inline">
                    Welcome, {user.name || user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/auth/login" 
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/auth/register" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-50 border-t border-gray-200">
              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                🏠 Home
              </Link>
              <Link 
                href="/games" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
              >
                🎮 Games
              </Link>
              <Link 
                href="/leaderboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                🏆 Leaderboard
              </Link>
              <Link 
                href="/history" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                📚 History
              </Link>
              
              {user ? (
                <>
                  <Link 
                    href="/picks" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    📝 My Picks
                  </Link>
                  {user.isAdmin && (
                    <Link 
                      href="/admin" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      ⚙️ Admin
                    </Link>
                  )}
                  <div className="px-3 py-2">
                    <p className="text-sm text-gray-500 mb-2">
                      Welcome, {user.name || user.email}
                    </p>
                    <button
                      onClick={handleLogout}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <Link 
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}