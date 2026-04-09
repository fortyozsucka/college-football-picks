import { db } from './db'

export class SideBetService {
  // Cancel expired open side bets when games start
  static async cancelExpiredSideBets() {
    try {
      const now = new Date()
      
      // Find all open side bets for games that have started
      const expiredBets = await db.sideBet.findMany({
        where: {
          status: 'OPEN',
          game: {
            startTime: {
              lte: now
            }
          }
        },
        include: {
          game: {
            select: {
              homeTeam: true,
              awayTeam: true,
              startTime: true
            }
          }
        }
      })

      if (expiredBets.length === 0) {
        return { cancelled: 0 }
      }

      // Cancel all expired bets
      const result = await db.sideBet.updateMany({
        where: {
          id: { in: expiredBets.map(bet => bet.id) }
        },
        data: {
          status: 'CANCELLED'
        }
      })

      console.log(`🚫 Cancelled ${result.count} expired side bets`)
      
      return { cancelled: result.count }
    } catch (error) {
      console.error('Error cancelling expired side bets:', error)
      throw error
    }
  }

  // Resolve all side bets for a completed game
  static async resolveGameSideBets(gameId: string) {
    try {
      const game = await db.game.findUnique({
        where: { id: gameId },
        include: {
          sideBets: {
            where: {
              status: 'ACCEPTED',
              isResolved: false
            },
            include: {
              acceptances: true
            }
          }
        }
      })

      if (!game || !game.completed || game.homeScore === null || game.awayScore === null) {
        console.log(`Cannot resolve side bets for game ${gameId} - game not completed or missing scores`)
        return { resolved: 0 }
      }

      let resolvedCount = 0

      for (const sideBet of game.sideBets) {
        const winningSide = this.determineWinningSide(sideBet, game)
        
        if (winningSide) {
          // Update side bet with winning side
          await db.sideBet.update({
            where: { id: sideBet.id },
            data: {
              winningSide,
              isResolved: true,
              status: 'COMPLETED'
            }
          })

          // Update each acceptance with winner/loser status
          for (const acceptance of sideBet.acceptances) {
            const isWinner = this.isAcceptorWinner(sideBet, winningSide, acceptance.acceptorId)
            
            await db.sideBetAcceptance.update({
              where: { id: acceptance.id },
              data: { isWinner }
            })
          }

          resolvedCount++
        }
      }

      console.log(`Resolved ${resolvedCount} side bets for game ${gameId}`)
      return { resolved: resolvedCount }
    } catch (error) {
      console.error('Error resolving game side bets:', error)
      throw error
    }
  }

  // Determine which side won based on game result and bet details
  private static determineWinningSide(sideBet: any, game: any): string | null {
    const { homeScore, awayScore, spread, overUnder } = game
    
    if (homeScore === null || awayScore === null) {
      return null
    }

    if (sideBet.betType === 'SPREAD') {
      const line = sideBet.customLine !== null ? sideBet.customLine : spread
      const homeScoreATS = homeScore + line // Add spread to home score
      
      if (homeScoreATS > awayScore) {
        return 'HOME'
      } else if (homeScoreATS < awayScore) {
        return 'AWAY'
      } else {
        // Push - no winner (could add push handling if needed)
        return null
      }
    }

    if (sideBet.betType === 'OVER_UNDER') {
      const line = sideBet.customLine !== null ? sideBet.customLine : overUnder
      if (!line) return null
      
      const totalPoints = homeScore + awayScore
      
      if (totalPoints > line) {
        return 'OVER'
      } else if (totalPoints < line) {
        return 'UNDER'
      } else {
        // Push - no winner
        return null
      }
    }

    return null
  }

  // Determine if a specific acceptor won their side of the bet
  private static isAcceptorWinner(sideBet: any, winningSide: string, acceptorId: string): boolean {
    // The acceptor takes the opposite side of the proposer
    const proposerSide = sideBet.betSide
    const acceptorSide = this.getOppositeSide(proposerSide)
    
    return acceptorSide === winningSide
  }

  // Get the opposite side of a bet
  private static getOppositeSide(side: string): string {
    switch (side) {
      case 'HOME': return 'AWAY'
      case 'AWAY': return 'HOME'
      case 'OVER': return 'UNDER'
      case 'UNDER': return 'OVER'
      default: return side
    }
  }

  // Get side bet statistics for a user
  static async getUserSideBetStats(userId: string) {
    try {
      // Proposed bets stats - only include completed bets with acceptances
      const proposedBets = await db.sideBet.findMany({
        where: { 
          proposerId: userId,
          isResolved: true,
          status: 'COMPLETED',
          acceptances: {
            some: {} // Only include bets that have at least one acceptance
          }
        },
        include: {
          acceptances: true
        }
      })

      // Accepted bets stats - only include completed bets
      const acceptedBets = await db.sideBetAcceptance.findMany({
        where: { 
          acceptorId: userId,
          sideBet: {
            isResolved: true,
            status: 'COMPLETED'
          }
        },
        include: {
          sideBet: true
        }
      })

      let totalWins = 0
      let totalLosses = 0
      let totalWinnings = 0
      let totalLosses$ = 0

      // Calculate wins/losses from proposed bets
      for (const bet of proposedBets) {
        if (bet.winningSide) {
          const proposerWon = bet.betSide === bet.winningSide
          
          for (const acceptance of bet.acceptances) {
            if (proposerWon) {
              totalWins++
              totalWinnings += bet.amount
            } else {
              totalLosses++
              totalLosses$ += bet.amount
            }
          }
        }
      }

      // Calculate wins/losses from accepted bets
      for (const acceptance of acceptedBets) {
        if (acceptance.isWinner !== null) {
          if (acceptance.isWinner) {
            totalWins++
            totalWinnings += acceptance.sideBet.amount
          } else {
            totalLosses++
            totalLosses$ += acceptance.sideBet.amount
          }
        }
      }

      const totalBets = totalWins + totalLosses
      const winPercentage = totalBets > 0 ? (totalWins / totalBets) * 100 : 0
      const netWinnings = totalWinnings - totalLosses$

      return {
        totalBets,
        wins: totalWins,
        losses: totalLosses,
        winPercentage: Math.round(winPercentage * 100) / 100,
        totalWinnings,
        totalLosses: totalLosses$,
        netWinnings
      }
    } catch (error) {
      console.error('Error getting user side bet stats:', error)
      throw error
    }
  }

  // Get all unresolved side bets for a user (for payment tracking)
  static async getUserUnresolvedBets(userId: string) {
    try {
      const unresolvedBets = await db.sideBet.findMany({
        where: {
          OR: [
            { proposerId: userId },
            { acceptances: { some: { acceptorId: userId } } }
          ],
          isResolved: true,
          acceptances: {
            some: {
              isPaid: false,
              OR: [
                { acceptorId: userId },
                { sideBet: { proposerId: userId } }
              ]
            }
          }
        },
        include: {
          game: {
            select: {
              homeTeam: true,
              awayTeam: true,
              homeScore: true,
              awayScore: true
            }
          },
          proposer: {
            select: {
              id: true,
              name: true,
              venmoHandle: true
            }
          },
          acceptances: {
            include: {
              acceptor: {
                select: {
                  id: true,
                  name: true,
                  venmoHandle: true
                }
              }
            }
          }
        }
      })

      return unresolvedBets
    } catch (error) {
      console.error('Error getting unresolved bets:', error)
      throw error
    }
  }
}