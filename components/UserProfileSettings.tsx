'use client'

import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  useToast,
  Alert,
  AlertIcon,
  HStack,
  Link,
  useColorModeValue
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { ExternalLinkIcon } from '@chakra-ui/icons'

export default function UserProfileSettings() {
  const { user } = useAuth()
  const [venmoHandle, setVenmoHandle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToast()

  // Load current venmo handle
  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  const loadUserProfile = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}/profile`)
      if (response.ok) {
        const profile = await response.json()
        setVenmoHandle(profile.venmoHandle || '')
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ venmoHandle: venmoHandle.trim() || null })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      toast({
        title: 'Profile Updated',
        description: 'Your Venmo handle has been saved',
        status: 'success',
        duration: 3000
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        status: 'error',
        duration: 5000
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <Heading size="md">👤 Profile Settings</Heading>
      </CardHeader>
      <CardBody>
        <VStack spacing={4} align="stretch">
          <Alert status="info" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="semibold">
                Venmo Integration for Side Bets
              </Text>
              <Text fontSize="sm">
                Add your Venmo handle to make payments easier when you lose side bets. 
                This is completely optional and only visible to users you have active bets with.
              </Text>
            </VStack>
          </Alert>

          <FormControl>
            <FormLabel>
              <HStack>
                <Text>Venmo Handle</Text>
                <Link 
                  href="https://venmo.com" 
                  isExternal 
                  fontSize="sm" 
                  color="blue.500"
                >
                  What&apos;s this? <ExternalLinkIcon mx="2px" />
                </Link>
              </HStack>
            </FormLabel>
            <Input
              value={venmoHandle}
              onChange={(e) => setVenmoHandle(e.target.value)}
              placeholder="your-venmo-username"
              disabled={isLoading || isSaving}
            />
            <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")} mt={1}>
              Enter just your username without @ (e.g., &quot;john-smith&quot;, not &quot;@john-smith&quot;)
            </Text>
          </FormControl>

          {venmoHandle && (
            <Alert status="success" size="sm">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm">
                  <strong>Preview:</strong> When you lose a side bet, winners will see a &quot;Pay&quot; button 
                  that links to: venmo.com/{venmoHandle}
                </Text>
              </VStack>
            </Alert>
          )}

          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.500">
              🔒 Your Venmo handle is only shown to users with active side bets
            </Text>
            <Button
              colorScheme="blue"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isLoading}
            >
              Save Settings
            </Button>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  )
}