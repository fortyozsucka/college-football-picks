export interface User {
  id: string
  email: string
  name: string | null
  totalScore: number
  createdAt: Date
  updatedAt: Date
}

export interface Game {
  id: string
  cfbId: string
  week: number
  season: number
  homeTeam: string
  awayTeam: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeTeamLogo: string | null
  awayTeamLogo: string | null
  homeScore: number | null
  awayScore: number | null
  spread: number
  overUnder: number | null
  startTime: Date
  completed: boolean
  winner: string | null
  gameType: 'REGULAR' | 'CHAMPIONSHIP' | 'BOWL' | 'PLAYOFF' | 'ARMY_NAVY'
  picks?: Pick[]
}

export interface Pick {
  id: string
  userId: string
  gameId: string
  pickedTeam: string
  lockedSpread: number
  isDoubleDown: boolean
  points: number | null
  result: string | null
  createdAt: Date
  updatedAt: Date
  user: User
  game: Game
}

export interface CFBGame {
  id: string
  season: number
  week: number
  startDate: string
  completed: boolean
  homeTeam?: string
  awayTeam?: string
  home_team?: string
  away_team?: string
  home?: string
  away?: string
  homeId?: number
  awayId?: number
  home_points?: number
  away_points?: number
  homePoints?: number
  awayPoints?: number
  homeClassification?: string
  awayClassification?: string
}

export interface CFBLine {
  id: string
  lines: Array<{
    spread: number
    overUnder: number
    provider: string
  }>
}