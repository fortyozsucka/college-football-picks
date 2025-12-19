export enum GameType {
  REGULAR = 'REGULAR',
  CHAMPIONSHIP = 'CHAMPIONSHIP',
  BOWL = 'BOWL',
  PLAYOFF = 'PLAYOFF',
  ARMY_NAVY = 'ARMY_NAVY'
}

export enum BowlTier {
  PREMIUM = 'PREMIUM', // NY6 bowls and playoff games (2 pts win, -1 loss/no pick)
  STANDARD = 'STANDARD' // Other bowl games (1 pt win, 0 loss)
}

export interface GameClassification {
  gameType: GameType
  isDoubleDownRequired: boolean
  countsTowardLimit: boolean
  description: string
  bowlTier?: BowlTier
}

export interface SpecialGameRules {
  maxRegularPicks: number
  maxChampionshipPicks: number
  requireAllBowlPicks: boolean
  allChampionshipDoubleDown: boolean
  allBowlDoubleDown: boolean
  armyNavyDoubleDown: boolean
}

export const SPECIAL_GAME_RULES: SpecialGameRules = {
  maxRegularPicks: 5,
  maxChampionshipPicks: 5,
  requireAllBowlPicks: true,
  allChampionshipDoubleDown: true,
  allBowlDoubleDown: true,
  armyNavyDoubleDown: true
}

// Keywords and patterns to identify special games
const CHAMPIONSHIP_KEYWORDS = [
  'championship',
  'title',
  'conference championship',
  'acc championship',
  'big 10 championship',
  'big ten championship',
  'big 12 championship',
  'pac-12 championship',
  'sec championship',
  'mountain west championship',
  'american championship',
  'mac championship',
  'c-usa championship',
  'sun belt championship'
]

const BOWL_KEYWORDS = [
  'bowl',
  'cotton bowl',
  'rose bowl',
  'sugar bowl',
  'orange bowl',
  'fiesta bowl',
  'peach bowl',
  'citrus bowl',
  'outback bowl',
  'gator bowl',
  'holiday bowl',
  'alamo bowl',
  'armed forces bowl',
  'independence bowl',
  'liberty bowl',
  'new mexico bowl',
  'las vegas bowl',
  'hawaii bowl',
  'new orleans bowl'
]

const PLAYOFF_KEYWORDS = [
  'playoff',
  'semifinal',
  'national championship',
  'cfp',
  'college football playoff'
]

// New Year's Six bowl games (premium tier)
const NY6_BOWLS = [
  'rose bowl',
  'sugar bowl',
  'orange bowl',
  'cotton bowl',
  'fiesta bowl',
  'peach bowl'
]

/**
 * Determine the tier of a bowl/playoff game for scoring purposes
 * PREMIUM = NY6 bowls + playoff games (2 pts win, -1 loss/no pick)
 * STANDARD = Other bowl games (1 pt win, 0 loss)
 */
export function determineBowlTier(
  notes: string = '',
  gameName: string = ''
): BowlTier {
  const notesLower = notes.toLowerCase()
  const gameNameLower = gameName.toLowerCase()
  const combined = `${notesLower} ${gameNameLower}`

  // Check for playoff games (National Championship, Semifinals)
  if (combined.includes('national championship') ||
      combined.includes('semifinal') ||
      combined.includes('semi-final') ||
      combined.includes('playoff')) {
    return BowlTier.PREMIUM
  }

  // Check for NY6 bowls
  if (NY6_BOWLS.some(bowl => combined.includes(bowl))) {
    return BowlTier.PREMIUM
  }

  // All other bowls are standard
  return BowlTier.STANDARD
}

/**
 * Calculate points based on game type, bowl tier, and result
 *
 * PREMIUM bowls/playoffs (NY6 + Playoff): 2 pts win, -1 loss/push
 * STANDARD bowls: 1 pt win, 0 loss/push
 * Regular games: 2 pts double-down win, 1 pt win, -1 double-down loss, 0 loss
 */
export function calculatePoints(
  gameType: GameType,
  bowlTier: BowlTier | undefined,
  isWin: boolean,
  isPush: boolean,
  isDoubleDown: boolean
): number {
  // Handle bowl and playoff games with tier-based scoring
  if (gameType === GameType.BOWL || gameType === GameType.PLAYOFF) {
    if (bowlTier === BowlTier.PREMIUM) {
      // Premium bowls/playoffs: 2 pts win, -1 loss/push
      if (isWin && !isPush) return 2
      return -1
    } else {
      // Standard bowls: 1 pt win, 0 loss/push
      if (isWin && !isPush) return 1
      return 0
    }
  }

  // Regular season and championship games use standard double-down logic
  if (isPush) {
    return isDoubleDown ? -1 : 0
  }

  if (isWin) {
    return isDoubleDown ? 2 : 1
  } else {
    return isDoubleDown ? -1 : 0
  }
}

/**
 * Classify a game based on team names, week, notes field, and other factors
 */
export function classifyGame(
  homeTeam: string,
  awayTeam: string,
  week: number,
  season: number,
  notes?: string,
  gameName?: string
): GameClassification {
  const homeTeamLower = homeTeam.toLowerCase()
  const awayTeamLower = awayTeam.toLowerCase()
  const notesLower = notes?.toLowerCase() || ''
  const gameNameLower = gameName?.toLowerCase() || ''

  // Check for Army-Navy game specifically
  if ((homeTeamLower.includes('army') && awayTeamLower.includes('navy')) ||
      (homeTeamLower.includes('navy') && awayTeamLower.includes('army'))) {
    return {
      gameType: GameType.ARMY_NAVY,
      isDoubleDownRequired: true,
      countsTowardLimit: false, // Army-Navy doesn't count toward 5-game limit
      description: 'Army-Navy Game (Mandatory Double Down)'
    }
  }

  // Check for championship games using notes field (PRIMARY METHOD)
  // Championship games have "Championship" in the notes field regardless of week
  if (notesLower.includes('championship') || CHAMPIONSHIP_KEYWORDS.some(keyword => notesLower.includes(keyword))) {
    return {
      gameType: GameType.CHAMPIONSHIP,
      isDoubleDownRequired: true,
      countsTowardLimit: true,
      description: 'Conference Championship (Mandatory Double Down)'
    }
  }

  // Check for playoff games (specific game names or notes)
  if (notesLower.includes('playoff') || notesLower.includes('national championship') ||
      PLAYOFF_KEYWORDS.some(keyword => notesLower.includes(keyword)) ||
      PLAYOFF_KEYWORDS.some(keyword => gameNameLower.includes(keyword))) {
    const bowlTier = determineBowlTier(notes, gameName)
    if (notesLower.includes('national championship') || gameNameLower.includes('national championship')) {
      return {
        gameType: GameType.PLAYOFF,
        isDoubleDownRequired: true,
        countsTowardLimit: false, // Playoff games don't count toward 5-game limit
        description: 'National Championship (Must Pick, 2 pts win / -1 loss)',
        bowlTier
      }
    }
    return {
      gameType: GameType.PLAYOFF,
      isDoubleDownRequired: true,
      countsTowardLimit: false, // Playoff games don't count toward 5-game limit
      description: 'College Football Playoff (Must Pick, 2 pts win / -1 loss)',
      bowlTier
    }
  }

  // Check for bowl games using notes or game name
  if (notesLower.includes('bowl') || BOWL_KEYWORDS.some(keyword => notesLower.includes(keyword)) ||
      BOWL_KEYWORDS.some(keyword => gameNameLower.includes(keyword))) {
    const bowlTier = determineBowlTier(notes, gameName)
    const pointDescription = bowlTier === BowlTier.PREMIUM
      ? '2 pts win / -1 loss'
      : '1 pt win / 0 loss'

    return {
      gameType: GameType.BOWL,
      isDoubleDownRequired: true,
      countsTowardLimit: false, // Bowl games don't count toward 5-game limit
      description: `Bowl Game (Must Pick, ${pointDescription})`,
      bowlTier
    }
  }

  // Default to regular game
  return {
    gameType: GameType.REGULAR,
    isDoubleDownRequired: false,
    countsTowardLimit: true,
    description: 'Regular Season Game'
  }
}

/**
 * Get pick validation rules for a specific week
 */
export function getWeekPickRules(games: Array<{
  gameType: GameType,
  homeTeam: string,
  awayTeam: string
}>) {
  const regularGames = games.filter(g => g.gameType === GameType.REGULAR)
  const championshipGames = games.filter(g => g.gameType === GameType.CHAMPIONSHIP)
  const bowlGames = games.filter(g => g.gameType === GameType.BOWL)
  const playoffGames = games.filter(g => g.gameType === GameType.PLAYOFF)
  const armyNavyGames = games.filter(g => g.gameType === GameType.ARMY_NAVY)

  const rules = {
    maxRegularPicks: Math.min(SPECIAL_GAME_RULES.maxRegularPicks, regularGames.length),
    maxChampionshipPicks: Math.min(SPECIAL_GAME_RULES.maxChampionshipPicks, championshipGames.length),
    requiredBowlPicks: SPECIAL_GAME_RULES.requireAllBowlPicks ? bowlGames.length : 0,
    requiredPlayoffPicks: playoffGames.length, // All playoff games must be picked
    requiredArmyNavyPicks: armyNavyGames.length, // Army-Navy if available
    
    // Double down requirements
    championshipDoubleDowns: SPECIAL_GAME_RULES.allChampionshipDoubleDown ? championshipGames.length : 0,
    bowlDoubleDowns: SPECIAL_GAME_RULES.allBowlDoubleDown ? bowlGames.length : 0,
    playoffDoubleDowns: playoffGames.length,
    armyNavyDoubleDowns: SPECIAL_GAME_RULES.armyNavyDoubleDown ? armyNavyGames.length : 0,

    // Summary
    totalGames: games.length,
    minRequiredPicks: bowlGames.length + playoffGames.length + armyNavyGames.length,
    maxTotalPicks: regularGames.length + championshipGames.length + bowlGames.length + playoffGames.length + armyNavyGames.length
  }

  return rules
}

/**
 * Validate user picks against game type rules
 */
export function validateUserPicks(
  picks: Array<{
    gameType: GameType,
    isDoubleDown: boolean,
    gameId: string
  }>
) {
  const errors: string[] = []
  const warnings: string[] = []

  const regularPicks = picks.filter(p => p.gameType === GameType.REGULAR)
  const championshipPicks = picks.filter(p => p.gameType === GameType.CHAMPIONSHIP)
  const bowlPicks = picks.filter(p => p.gameType === GameType.BOWL)
  const playoffPicks = picks.filter(p => p.gameType === GameType.PLAYOFF)
  const armyNavyPicks = picks.filter(p => p.gameType === GameType.ARMY_NAVY)

  // Check regular game limits
  if (regularPicks.length > SPECIAL_GAME_RULES.maxRegularPicks) {
    errors.push(`Too many regular season picks (${regularPicks.length}/${SPECIAL_GAME_RULES.maxRegularPicks})`)
  }

  // Check championship game limits
  if (championshipPicks.length > SPECIAL_GAME_RULES.maxChampionshipPicks) {
    errors.push(`Too many championship picks (${championshipPicks.length}/${SPECIAL_GAME_RULES.maxChampionshipPicks})`)
  }

  // Check mandatory double downs for special games
  const championshipNonDoubleDowns = championshipPicks.filter(p => !p.isDoubleDown)
  if (championshipNonDoubleDowns.length > 0) {
    errors.push(`All championship games must be double downs (${championshipNonDoubleDowns.length} missing)`)
  }

  const bowlNonDoubleDowns = bowlPicks.filter(p => !p.isDoubleDown)
  if (bowlNonDoubleDowns.length > 0) {
    errors.push(`All bowl games must be double downs (${bowlNonDoubleDowns.length} missing)`)
  }

  const playoffNonDoubleDowns = playoffPicks.filter(p => !p.isDoubleDown)
  if (playoffNonDoubleDowns.length > 0) {
    errors.push(`All playoff games must be double downs (${playoffNonDoubleDowns.length} missing)`)
  }

  const armyNavyNonDoubleDowns = armyNavyPicks.filter(p => !p.isDoubleDown)
  if (armyNavyNonDoubleDowns.length > 0) {
    errors.push(`Army-Navy game must be double down`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      regularPicks: regularPicks.length,
      championshipPicks: championshipPicks.length,
      bowlPicks: bowlPicks.length,
      playoffPicks: playoffPicks.length,
      armyNavyPicks: armyNavyPicks.length,
      totalDoubleDowns: picks.filter(p => p.isDoubleDown).length
    }
  }
}

export default {
  classifyGame,
  getWeekPickRules,
  validateUserPicks,
  GameType,
  SPECIAL_GAME_RULES
}