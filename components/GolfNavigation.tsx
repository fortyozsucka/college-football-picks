'use client'

import {
  Box,
  Flex,
  HStack,
  Link as ChakraLink,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Stack,
  Text,
  Container,
  Skeleton,
  Avatar,
  Badge,
} from '@chakra-ui/react'
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons'
import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { useState, useEffect } from 'react'
import { DarkModeToggle } from './DarkModeToggle'

const NavLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  const linkColor = useColorModeValue('neutral.600', 'neutral.300')
  const hoverBg = useColorModeValue('neutral.100', 'neutral.700')
  const hoverColor = useColorModeValue('neutral.900', 'white')

  return (
    <ChakraLink
      as={Link}
      href={href}
      px={2}
      py={2}
      rounded="md"
      color={linkColor}
      fontWeight="500"
      fontSize="sm"
      whiteSpace="nowrap"
      _hover={{ textDecoration: 'none', bg: hoverBg, color: hoverColor }}
      transition="all 0.2s ease"
    >
      {children}
    </ChakraLink>
  )
}

export default function GolfNavigation() {
  const { user, logout, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)

  const navBg = useColorModeValue('white', 'neutral.800')
  const navBorder = useColorModeValue('neutral.200', 'neutral.700')
  const logoGradient = useColorModeValue(
    'linear(to-r, green.700, green.400)',
    'linear(to-r, green.300, green.100)'
  )

  useEffect(() => { setIsClient(true) }, [])

  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
  }

  if (loading || !isClient) {
    return (
      <Box bg={navBg} boxShadow="0 1px 3px rgba(0,0,0,0.1)" borderBottom="1px" borderColor={navBorder} mb={8}>
        <Container maxW="7xl">
          <Flex h={16} alignItems="center" justifyContent="space-between">
            <Text fontWeight="bold" fontSize="xl" bgGradient={logoGradient} bgClip="text">
              ⛳ Squad Golf
            </Text>
            <Skeleton height="20px" width="80px" />
          </Flex>
        </Container>
      </Box>
    )
  }

  return (
    <Box bg={navBg} boxShadow="0 1px 3px rgba(0,0,0,0.1)" borderBottom="1px" borderColor={navBorder} mb={{ base: 4, sm: 8 }}>
      <Container maxW="7xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          {/* Logo */}
          <HStack spacing={8} alignItems="center">
            <ChakraLink as={Link} href="/golf" _hover={{ textDecoration: 'none' }}>
              <Text fontWeight="bold" fontSize={{ base: 'lg', sm: 'xl' }} bgGradient={logoGradient} bgClip="text">
                ⛳ Squad Golf
              </Text>
            </ChakraLink>

            {/* Desktop Nav */}
            <HStack as="nav" spacing={2} display={{ base: 'none', md: 'flex' }}>
              {user?.playGolf && (
                <>
                  <NavLink href="/golf">Tournaments</NavLink>
                  <NavLink href="/golf/picks">My Picks</NavLink>
                  <NavLink href="/golf/leaderboard">Leaderboard</NavLink>
                  <NavLink href="/golf/scorecard">Scorecard</NavLink>
                  <NavLink href="/golf/field">Field</NavLink>
                </>
              )}
              {user?.isAdmin && (
                <NavLink href="/admin">
                  <HStack spacing={1}>
                    <Text>Admin</Text>
                    <Badge colorScheme="red" size="sm">ADMIN</Badge>
                  </HStack>
                </NavLink>
              )}
            </HStack>
          </HStack>

          {/* Right side */}
          <Flex alignItems="center" gap={2}>
            <DarkModeToggle />
            <Button as={Link} href="/" size="sm" variant="ghost" fontSize="sm">
              ← Switch Sport
            </Button>

            {user && (
              <>
                <Menu>
                  <MenuButton
                    as={Button}
                    rounded="full"
                    variant="link"
                    cursor="pointer"
                    minW={0}
                    display={{ base: 'none', md: 'flex' }}
                  >
                    <HStack>
                      <Avatar size="sm" name={user.name || user.email} />
                      <Text fontSize="sm" fontWeight="medium">{user.name || user.email}</Text>
                    </HStack>
                  </MenuButton>
                  <MenuList>
                    <MenuItem as={Link} href="/golf">Tournaments</MenuItem>
                    <MenuItem as={Link} href="/golf/picks">My Picks</MenuItem>
                    <MenuItem as={Link} href="/golf/leaderboard">Leaderboard</MenuItem>
                    <MenuItem as={Link} href="/golf/scorecard">Scorecard</MenuItem>
                    <MenuItem as={Link} href="/golf/field">Field</MenuItem>
                    <MenuItem as={Link} href="/settings">Settings</MenuItem>
                    {user.isAdmin && <MenuItem as={Link} href="/admin" color="red.500">Admin</MenuItem>}
                    <MenuItem onClick={handleLogout} color="red.500">Logout</MenuItem>
                  </MenuList>
                </Menu>

                <IconButton
                  size="md"
                  icon={mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
                  aria-label="Open Menu"
                  display={{ md: 'none' }}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  variant="ghost"
                />
              </>
            )}
          </Flex>
        </Flex>

        {/* Mobile menu */}
        {user && mobileMenuOpen && (
          <Box pb={4} display={{ md: 'none' }}>
            <Stack as="nav" spacing={4}>
              <Flex align="center" p={2}>
                <Avatar size="sm" name={user.name || user.email} mr={3} />
                <Text fontSize="sm" fontWeight="medium">{user.name || user.email}</Text>
              </Flex>
              <NavLink href="/golf">Tournaments</NavLink>
              <NavLink href="/golf/picks">My Picks</NavLink>
              <NavLink href="/golf/leaderboard">Leaderboard</NavLink>
              <NavLink href="/golf/scorecard">Scorecard</NavLink>
              <NavLink href="/golf/field">Field</NavLink>
              <NavLink href="/settings">Settings</NavLink>
              {user.isAdmin && (
                <NavLink href="/admin">
                  <HStack spacing={1}>
                    <Text>Admin</Text>
                    <Badge colorScheme="red" size="sm">ADMIN</Badge>
                  </HStack>
                </NavLink>
              )}
              <Button as={Link} href="/" variant="ghost" size="sm" justifyContent="flex-start">
                ← Switch Sport
              </Button>
              <Button onClick={handleLogout} variant="ghost" colorScheme="red" size="sm" justifyContent="flex-start">
                Logout
              </Button>
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  )
}
