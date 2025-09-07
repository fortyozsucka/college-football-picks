'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import NotificationSettings from '@/components/NotificationSettings'
import UserProfileSettings from '@/components/UserProfileSettings'

export default function ChakraSettingsPage() {
  const bgGradient = useColorModeValue('linear(to-br, gray.50, football.50)', 'linear(to-br, gray.900, football.900)')
  const titleGradient = useColorModeValue('linear(to-r, neutral.900, brand.600)', 'linear(to-r, neutral.100, brand.400)')
  
  return (
    <ProtectedRoute>
      <Box bg={bgGradient} minH="100vh" py={8}>
        <Container maxW="4xl">
          <VStack spacing={8} align="stretch">
            {/* Header */}
            <Box textAlign="center">
              <Heading 
                size="2xl" 
                bgGradient={titleGradient}
                bgClip="text"
                mb={4}
              >
                ⚙️ Settings
              </Heading>
              <Text fontSize="lg" color={useColorModeValue("neutral.600", "neutral.300")}>
                Manage your account preferences and notifications
              </Text>
            </Box>

            {/* Settings Grid */}
            <SimpleGrid columns={{ base: 1, lg: 1 }} spacing={6}>
              {/* Profile Settings */}
              <UserProfileSettings />
              
              {/* Notification Settings */}
              <NotificationSettings showTitle={true} />
              
              {/* Future settings sections can be added here */}
              {/* 
              <AccountSettings />
              <PrivacySettings />
              <DisplaySettings />
              */}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>
    </ProtectedRoute>
  )
}