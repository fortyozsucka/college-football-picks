'use client'

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  useToast,
  useColorModeValue
} from '@chakra-ui/react'
import { useState } from 'react'
import { useSideBets } from '@/lib/hooks/useSideBets'
import { SelectField, NumberField, TextareaField, SwitchField } from '@/components/ui/FormField'
import { ErrorAlert } from '@/components/ui/ErrorAlert'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number | null
  startTime: string
}

interface CreateSideBetModalProps {
  isOpen: boolean
  onClose: () => void
  game: Game
  onSuccess?: () => void
}

export default function CreateSideBetModal({ 
  isOpen, 
  onClose, 
  game, 
  onSuccess 
}: CreateSideBetModalProps) {
  const [betType, setBetType] = useState<'SPREAD' | 'OVER_UNDER'>('SPREAD')
  const [betSide, setBetSide] = useState<string>('HOME')
  const [useCustomLine, setUseCustomLine] = useState(false)
  const [customLine, setCustomLine] = useState<number>(0)
  const [amount, setAmount] = useState<number>(10)
  const [note, setNote] = useState('')
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [maxAcceptors, setMaxAcceptors] = useState<number>(1)

  const { createSideBet, isLoading, error } = useSideBets()
  const toast = useToast()

  const currentLine = betType === 'SPREAD' ? game.spread : game.overUnder

  const handleSubmit = async () => {
    try {
      const betData = {
        gameId: game.id,
        betType,
        betSide,
        customLine: useCustomLine ? customLine : undefined,
        amount,
        note: note.trim() || undefined,
        allowMultiple,
        maxAcceptors: allowMultiple ? maxAcceptors : undefined
      }

      await createSideBet(betData)
      
      toast({
        title: 'Side bet created!',
        description: 'Your bet is now open for acceptance',
        status: 'success',
        duration: 3000
      })

      onClose()
      onSuccess?.()
    } catch (err) {
      toast({
        title: 'Error creating bet',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000
      })
    }
  }

  const handleClose = () => {
    setBetType('SPREAD')
    setBetSide('HOME')
    setUseCustomLine(false)
    setCustomLine(0)
    setAmount(10)
    setNote('')
    setAllowMultiple(false)
    setMaxAcceptors(1)
    onClose()
  }

  const gameStarted = new Date() >= new Date(game.startTime)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Create Side Bet
          <Text fontSize="sm" fontWeight="normal" color={useColorModeValue("gray.600", "gray.300")}>
            {game.awayTeam} @ {game.homeTeam}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {gameStarted && (
            <ErrorAlert 
              error="Game has already started. Side bets cannot be created."
              title="Game Started"
            />
          )}

          <VStack spacing={4} align="stretch">
            {/* Bet Type */}
            <SelectField
              label="Bet Type"
              value={betType}
              onChange={(e) => {
                setBetType(e.target.value as 'SPREAD' | 'OVER_UNDER')
                setBetSide(e.target.value === 'SPREAD' ? 'HOME' : 'OVER')
              }}
              isDisabled={gameStarted}
              options={[
                { value: 'SPREAD', label: 'Point Spread' },
                { value: 'OVER_UNDER', label: 'Over/Under' }
              ]}
            />

            {/* Bet Side */}
            <SelectField
              label="Your Pick"
              value={betSide}
              onChange={(e) => setBetSide(e.target.value)}
              isDisabled={gameStarted}
              options={betType === 'SPREAD' ? [
                { value: 'HOME', label: `${game.homeTeam} ${game.spread > 0 ? '+' : ''}${game.spread}` },
                { value: 'AWAY', label: `${game.awayTeam} ${game.spread < 0 ? '+' : ''}${-game.spread}` }
              ] : [
                { value: 'OVER', label: `Over ${currentLine}` },
                { value: 'UNDER', label: `Under ${currentLine}` }
              ]}
            />

            {/* Custom Line Toggle */}
            <SwitchField
              label="Use Custom Line"
              isChecked={useCustomLine}
              onChange={setUseCustomLine}
              isDisabled={gameStarted}
              helperText={!useCustomLine && currentLine !== null ? `Current line: ${currentLine}` : undefined}
            />

            {/* Custom Line Input */}
            {useCustomLine && (
              <NumberField
                label={`Custom ${betType === 'SPREAD' ? 'Spread' : 'Total'}`}
                value={customLine}
                onChange={setCustomLine}
                step={0.5}
                isDisabled={gameStarted}
              />
            )}

            {/* Bet Amount */}
            <NumberField
              label="Bet Amount ($)"
              value={amount}
              onChange={setAmount}
              min={1}
              isDisabled={gameStarted}
            />

            {/* Multiple Acceptors */}
            <SwitchField
              label="Allow Multiple Acceptors"
              isChecked={allowMultiple}
              onChange={setAllowMultiple}
              isDisabled={gameStarted}
            />

            {/* Max Acceptors */}
            {allowMultiple && (
              <NumberField
                label="Max Acceptors"
                helperText="Leave blank for unlimited"
                value={maxAcceptors}
                onChange={setMaxAcceptors}
                min={1}
                isDisabled={gameStarted}
              />
            )}

            {/* Note */}
            <TextareaField
              label="Note / Trash Talk (Optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note or some friendly trash talk..."
              isDisabled={gameStarted}
            />

            {error && (
              <ErrorAlert error={error} />
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={gameStarted}
          >
            Create Bet
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}