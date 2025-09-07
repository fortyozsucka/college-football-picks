'use client'

import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  Collapse,
  useDisclosure,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Link,
  useColorModeValue
} from '@chakra-ui/react'
import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { useSideBets, SideBet } from '@/lib/hooks/useSideBets'
import { useAuth } from '@/lib/context/AuthContext'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number | null
  startTime: string
  completed: boolean
  homeScore: number | null
  awayScore: number | null
}

interface GameSideBetsProps {
  game: Game
  onCreateBet: () => void
  onBetAction?: () => void // Callback for when side bets are accepted/cancelled
}

export default function GameSideBets({ game, onCreateBet, onBetAction }: GameSideBetsProps) {
  const { user } = useAuth()
  const { isOpen, onToggle } = useDisclosure()
  const [sideBets, setSideBets] = useState<SideBet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [confirmBet, setConfirmBet] = useState<string | null>(null)
  
  const { 
    fetchGameSideBets, 
    acceptSideBet, 
    cancelSideBet, 
    withdrawAcceptance,
    markAsPaid,
    formatBetDescription, 
    canAcceptBet 
  } = useSideBets()
  
  const toast = useToast()
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Load side bets when expanded
  useEffect(() => {
    if (isOpen) {
      loadSideBets()
    }
  }, [isOpen])

  const loadSideBets = async () => {
    setIsLoading(true)
    try {
      const bets = await fetchGameSideBets(game.id)
      setSideBets(bets)
    } catch (error) {
      console.error('Error loading side bets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptBet = async (sideBetId: string) => {
    try {
      await acceptSideBet(sideBetId)
      toast({
        title: 'Bet accepted!',
        description: 'You have successfully accepted the side bet',
        status: 'success',
        duration: 3000
      })
      loadSideBets() // Refresh the list
      onBetAction?.() // Notify parent to refresh summary
      setConfirmBet(null)
    } catch (error) {
      toast({
        title: 'Error accepting bet',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000
      })
    }
  }

  const handleCancelBet = async (sideBetId: string) => {
    try {
      await cancelSideBet(sideBetId)
      toast({
        title: 'Bet cancelled',
        description: 'Your side bet has been cancelled',
        status: 'success',
        duration: 3000
      })
      loadSideBets() // Refresh the list
      onBetAction?.() // Notify parent to refresh summary
    } catch (error) {
      toast({
        title: 'Error cancelling bet',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000
      })
    }
  }

  const handleWithdrawAcceptance = async (sideBetId: string) => {
    try {
      await withdrawAcceptance(sideBetId)
      toast({
        title: 'Acceptance withdrawn',
        description: 'You have withdrawn your acceptance',
        status: 'success',
        duration: 3000
      })
      loadSideBets() // Refresh the list
    } catch (error) {
      toast({
        title: 'Error withdrawing acceptance',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000
      })
    }
  }

  const handleMarkPaid = async (sideBetId: string, acceptanceId: string) => {
    try {
      await markAsPaid(sideBetId, acceptanceId)
      toast({
        title: 'Marked as paid',
        description: 'Payment has been recorded',
        status: 'success',
        duration: 3000
      })
      loadSideBets() // Refresh the list
    } catch (error) {
      toast({
        title: 'Error marking as paid',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'green'
      case 'ACCEPTED': return 'blue'
      case 'COMPLETED': return 'purple'
      case 'CANCELLED': return 'red'
      default: return 'gray'
    }
  }

  const getVenmoLink = (venmoHandle: string, amount: number, note: string) => {
    const encodedNote = encodeURIComponent(note)
    return `https://venmo.com/${venmoHandle}?txn=pay&amount=${amount}&note=${encodedNote}`
  }

  const gameStarted = new Date() >= new Date(game.startTime)
  const openBets = sideBets.filter(bet => bet.status === 'OPEN').length
  const userBets = sideBets.filter(bet => 
    bet.proposerId === user?.id || 
    bet.acceptances.some(a => a.acceptorId === user?.id)
  ).length

  return (
    <Box>
      <Button
        size="sm"
        variant={openBets > 0 ? "solid" : "ghost"}
        colorScheme={openBets > 0 ? "green" : "gray"}
        onClick={onToggle}
        rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        w="full"
        justifyContent="space-between"
        _hover={{
          transform: openBets > 0 ? "scale(1.02)" : undefined,
          shadow: openBets > 0 ? "md" : undefined
        }}
        transition="all 0.2s"
      >
        <HStack>
          <Text fontWeight={openBets > 0 ? "bold" : "normal"}>
            {openBets > 0 ? "💰 Side Bets Available!" : "Side Bets"}
          </Text>
          {openBets > 0 && (
            <Badge colorScheme="yellow" size="sm" variant="solid">
              {openBets} open
            </Badge>
          )}
          {userBets > 0 && (
            <Badge colorScheme="blue" size="sm">
              {userBets} yours
            </Badge>
          )}
        </HStack>
      </Button>

      <Collapse in={isOpen}>
        <VStack spacing={3} mt={3} align="stretch">
          {/* Create Bet Button */}
          {!gameStarted && (
            <Button size="sm" onClick={onCreateBet} colorScheme="blue">
              Create Side Bet
            </Button>
          )}

          {/* Side Bets List */}
          {isLoading ? (
            <Text textAlign="center" color="gray.500">
              Loading side bets...
            </Text>
          ) : sideBets.length === 0 ? (
            <Text textAlign="center" color="gray.500">
              No side bets for this game
            </Text>
          ) : (
            sideBets.map((bet) => (
              <Card key={bet.id} size="sm">
                <CardBody>
                  <VStack spacing={2} align="stretch">
                    {/* Bet Header */}
                    <HStack justify="space-between" align="start">
                      <VStack spacing={1} align="start" flex={1}>
                        <HStack>
                          <Text fontWeight="semibold" fontSize="sm">
                            {bet.proposer.name || 'Anonymous'}
                          </Text>
                          <Badge colorScheme={getStatusColor(bet.status)} size="sm">
                            {bet.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                          {formatBetDescription(bet)} • ${bet.amount}
                        </Text>
                        {!gameStarted && (
                          <Text fontSize="xs" color="orange.600">
                            ⏰ Closes at {new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                        {bet.note && (
                          <Text fontSize="xs" color="gray.500" fontStyle="italic">
                            &quot;{bet.note}&quot;
                          </Text>
                        )}
                      </VStack>
                    </HStack>

                    {/* Acceptances */}
                    {bet.acceptances.length > 0 && (
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          Accepted by:
                        </Text>
                        {bet.acceptances.map((acceptance) => (
                          <HStack key={acceptance.id} fontSize="sm" justify="space-between">
                            <Text>{acceptance.acceptor.name || 'Anonymous'}</Text>
                            {bet.isResolved && (
                              <HStack>
                                <Badge 
                                  colorScheme={acceptance.isWinner ? 'green' : 'red'}
                                  size="sm"
                                >
                                  {acceptance.isWinner ? 'Won' : 'Lost'}
                                </Badge>
                                {!acceptance.isPaid && (
                                  <Badge colorScheme="orange" size="sm">
                                    Unpaid
                                  </Badge>
                                )}
                              </HStack>
                            )}
                          </HStack>
                        ))}
                      </Box>
                    )}

                    {/* Action Buttons */}
                    <HStack spacing={2} flexWrap="wrap">
                      {/* Accept Bet */}
                      {canAcceptBet(bet) && (
                        <Button
                          size="xs"
                          colorScheme="green"
                          onClick={() => setConfirmBet(bet.id)}
                        >
                          Accept ${bet.amount}
                        </Button>
                      )}

                      {/* Cancel Bet (Proposer only, before acceptance) */}
                      {bet.proposerId === user?.id && 
                       bet.status === 'OPEN' && 
                       bet.acceptances.length === 0 && (
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => handleCancelBet(bet.id)}
                        >
                          Cancel
                        </Button>
                      )}

                      {/* Withdraw Acceptance (Before game starts) */}
                      {bet.acceptances.some(a => a.acceptorId === user?.id) &&
                       !gameStarted && (
                        <Button
                          size="xs"
                          colorScheme="orange"
                          variant="outline"
                          onClick={() => handleWithdrawAcceptance(bet.id)}
                        >
                          Withdraw
                        </Button>
                      )}

                      {/* Payment Actions for Resolved Bets */}
                      {bet.isResolved && bet.acceptances.map((acceptance) => {
                        const userIsInvolved = bet.proposerId === user?.id || acceptance.acceptorId === user?.id
                        if (!userIsInvolved || acceptance.isPaid) return null

                        const loser = acceptance.isWinner ? bet.proposer : acceptance.acceptor
                        const winner = acceptance.isWinner ? acceptance.acceptor : bet.proposer
                        const userIsLoser = (acceptance.isWinner && bet.proposerId === user?.id) || 
                                           (!acceptance.isWinner && acceptance.acceptorId === user?.id)

                        return (
                          <HStack key={acceptance.id} spacing={1}>
                            {/* Venmo Link for Loser */}
                            {userIsLoser && winner.venmoHandle && (
                              <Link
                                href={getVenmoLink(
                                  winner.venmoHandle, 
                                  bet.amount, 
                                  `Side bet: ${game.awayTeam} @ ${game.homeTeam}`
                                )}
                                isExternal
                              >
                                <Button size="xs" colorScheme="blue" rightIcon={<ExternalLinkIcon />}>
                                  Pay ${bet.amount}
                                </Button>
                              </Link>
                            )}

                            {/* Mark as Paid */}
                            <Button
                              size="xs"
                              colorScheme="purple"
                              variant="outline"
                              onClick={() => handleMarkPaid(bet.id, acceptance.id)}
                            >
                              Mark Paid
                            </Button>
                          </HStack>
                        )
                      })}
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))
          )}
        </VStack>
      </Collapse>

      {/* Confirmation Dialog */}
      <AlertDialog
        isOpen={confirmBet !== null}
        leastDestructiveRef={cancelRef}
        onClose={() => setConfirmBet(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Accept Side Bet
            </AlertDialogHeader>
            <AlertDialogBody>
              {confirmBet && (() => {
                const bet = sideBets.find(b => b.id === confirmBet)
                return bet ? (
                  <>
                    Are you sure you want to accept this ${bet.amount} bet?
                    <Box mt={2} p={2} bg="gray.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="semibold">
                        {bet.proposer.name}: {formatBetDescription(bet)}
                      </Text>
                      <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                        You&apos;ll be taking the opposite side for ${bet.amount}
                      </Text>
                    </Box>
                  </>
                ) : null
              })()}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setConfirmBet(null)}>
                Cancel
              </Button>
              <Button 
                colorScheme="green" 
                onClick={() => confirmBet && handleAcceptBet(confirmBet)}
                ml={3}
              >
                Accept Bet
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}