'use client'

import { useState } from 'react'
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Switch,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Badge,
  Spinner,
  useToast,
  useColorModeValue,
  Icon,
  Flex,
} from '@chakra-ui/react'
import { BellIcon, CheckIcon, WarningIcon } from '@chakra-ui/icons'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

interface NotificationSettingsProps {
  showTitle?: boolean
}

export default function NotificationSettings({ showTitle = true }: NotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
    error
  } = usePushNotifications()

  const [testLoading, setTestLoading] = useState(false)
  const toast = useToast()

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const handleSubscriptionToggle = async () => {
    try {
      if (isSubscribed) {
        const success = await unsubscribe()
        if (success) {
          toast({
            title: 'Push Notifications Disabled',
            description: 'You will no longer receive push notifications',
            status: 'info',
            duration: 3000,
            isClosable: true,
          })
        }
      } else {
        const success = await subscribe()
        if (success) {
          toast({
            title: 'Push Notifications Enabled',
            description: 'You will now receive push notifications',
            status: 'success',
            duration: 3000,
            isClosable: true,
          })
        }
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handlePreferenceChange = async (key: string, value: boolean) => {
    const success = await updatePreferences({ [key]: value } as any)
    if (success) {
      toast({
        title: 'Preferences Updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
    }
  }

  const handleTestNotification = async () => {
    setTestLoading(true)
    try {
      const success = await sendTestNotification()
      if (success) {
        toast({
          title: 'Test Notification Sent',
          description: 'Check your notifications!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      }
    } catch (err) {
      toast({
        title: 'Test Failed',
        description: 'Could not send test notification',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setTestLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <Alert status="warning" borderRadius="lg">
        <AlertIcon />
        <Box>
          <AlertTitle>Push Notifications Not Supported</AlertTitle>
          <AlertDescription>
            Your browser doesn&apos;t support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </AlertDescription>
        </Box>
      </Alert>
    )
  }

  return (
    <Card bg={cardBg} borderColor={borderColor} shadow="md">
      {showTitle && (
        <CardHeader>
          <HStack>
            <Icon as={BellIcon} color="brand.500" />
            <Heading size="md">🔔 Notification Settings</Heading>
          </HStack>
        </CardHeader>
      )}
      
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Error Alert */}
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Push Notification Status */}
          <Box>
            <Flex justify="space-between" align="center" mb={3}>
              <VStack align="start" spacing={1}>
                <Text fontWeight="semibold">Push Notifications</Text>
                <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                  Get real-time alerts about games and picks
                </Text>
              </VStack>
              <HStack>
                <Badge 
                  colorScheme={isSubscribed ? 'green' : 'gray'}
                  variant="solid"
                >
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </Badge>
                {isLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <Switch
                    isChecked={isSubscribed}
                    onChange={handleSubscriptionToggle}
                    colorScheme="brand"
                    size="lg"
                  />
                )}
              </HStack>
            </Flex>

            {isSubscribed && (
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                onClick={handleTestNotification}
                isLoading={testLoading}
                loadingText="Sending..."
                leftIcon={<CheckIcon />}
              >
                Send Test Notification
              </Button>
            )}
          </Box>

          {/* Notification Preferences */}
          {isSubscribed && preferences && (
            <>
              <Divider />
              
              <Box>
                <Text fontWeight="semibold" mb={4} color="gray.700">
                  📱 Notification Types
                </Text>
                
                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">Game Start Reminders</Text>
                      <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.300")}>
                        Alerts 30 minutes before games start
                      </Text>
                    </VStack>
                    <Switch
                      isChecked={preferences.gameStartReminders}
                      onChange={(e) => handlePreferenceChange('gameStartReminders', e.target.checked)}
                      colorScheme="brand"
                      isDisabled={isLoading}
                    />
                  </Flex>

                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">Game Results</Text>
                      <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.300")}>
                        Notifications when your picks win or lose
                      </Text>
                    </VStack>
                    <Switch
                      isChecked={preferences.gameResults}
                      onChange={(e) => handlePreferenceChange('gameResults', e.target.checked)}
                      colorScheme="brand"
                      isDisabled={isLoading}
                    />
                  </Flex>

                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">Weekly Recaps</Text>
                      <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.300")}>
                        Summary of your weekly performance
                      </Text>
                    </VStack>
                    <Switch
                      isChecked={preferences.weeklyRecaps}
                      onChange={(e) => handlePreferenceChange('weeklyRecaps', e.target.checked)}
                      colorScheme="brand"
                      isDisabled={isLoading}
                    />
                  </Flex>

                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">Leaderboard Updates</Text>
                      <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.300")}>
                        When your ranking changes
                      </Text>
                    </VStack>
                    <Switch
                      isChecked={preferences.leaderboardUpdates}
                      onChange={(e) => handlePreferenceChange('leaderboardUpdates', e.target.checked)}
                      colorScheme="brand"
                      isDisabled={isLoading}
                    />
                  </Flex>

                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">Friend Activity</Text>
                      <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.300")}>
                        When friends make picks or achievements
                      </Text>
                    </VStack>
                    <Switch
                      isChecked={preferences.friendActivity}
                      onChange={(e) => handlePreferenceChange('friendActivity', e.target.checked)}
                      colorScheme="brand"
                      isDisabled={isLoading}
                    />
                  </Flex>
                </VStack>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="semibold" mb={4} color="gray.700">
                  📧 Email Notifications
                </Text>
                
                <Flex justify="space-between" align="center">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium">Email Notifications</Text>
                    <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.300")}>
                      Receive notifications via email as backup
                    </Text>
                  </VStack>
                  <Switch
                    isChecked={preferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                    colorScheme="brand"
                    isDisabled={isLoading}
                  />
                </Flex>
              </Box>
            </>
          )}

          {/* Help Text */}
          <Alert status="info" borderRadius="md" size="sm">
            <AlertIcon />
            <Box>
              <Text fontSize="sm">
                💡 <strong>Tip:</strong> Make sure your browser allows notifications and your device isn&apos;t in Do Not Disturb mode.
              </Text>
            </Box>
          </Alert>
        </VStack>
      </CardBody>
    </Card>
  )
}