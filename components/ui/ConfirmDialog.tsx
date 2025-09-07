'use client'

import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  useDisclosure,
  Text
} from '@chakra-ui/react'
import { useRef, ReactNode } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  colorScheme?: string
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  colorScheme = 'red',
  isLoading = false
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Error handling should be done in the calling component
      console.error('Confirmation action failed:', error)
    }
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {title}
          </AlertDialogHeader>

          <AlertDialogBody>
            {typeof message === 'string' ? (
              <Text>{message}</Text>
            ) : (
              message
            )}
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              colorScheme={colorScheme}
              onClick={handleConfirm}
              ml={3}
              isLoading={isLoading}
              loadingText={confirmText}
            >
              {confirmText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

// Hook for managing confirmation dialogs
export function useConfirmDialog() {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const confirm = (options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => {
    return new Promise<boolean>((resolve) => {
      const originalOnConfirm = options.onConfirm
      
      const dialogProps = {
        ...options,
        isOpen,
        onClose: () => {
          onClose()
          resolve(false)
        },
        onConfirm: async () => {
          try {
            await originalOnConfirm()
            resolve(true)
          } catch (error) {
            resolve(false)
            throw error
          }
        }
      }

      onOpen()
      return <ConfirmDialog {...dialogProps} />
    })
  }

  return { confirm, isOpen, onClose }
}