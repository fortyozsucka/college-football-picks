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
  useDisclosure,
  useColorModeValue,
  Stack,
  Text,
  Container,
  Skeleton,
  Badge,
  Avatar,
  useBreakpointValue,
} from '@chakra-ui/react'
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons'
import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { useState, useEffect } from 'react'
import { DarkModeToggle } from './DarkModeToggle'

const NavLink = ({ children, href, isActive = false }: { 
  children: React.ReactNode, 
  href: string, 
  isActive?: boolean 
}) => {
  const linkColor = useColorModeValue(
    isActive ? 'brand.500' : 'neutral.600',
    isActive ? 'brand.400' : 'neutral.300'
  )
  const hoverBg = useColorModeValue('neutral.100', 'neutral.700')
  const hoverColor = useColorModeValue('neutral.900', 'white')

  return (
    <ChakraLink
      as={Link}
      href={href}
      px={2}
      py={2}
      rounded={'md'}
      color={linkColor}
      fontWeight={isActive ? '600' : '500'}
      fontSize="sm"
      whiteSpace="nowrap"
      _hover={{
        textDecoration: 'none',
        bg: hoverBg,
        color: hoverColor,
      }}
      transition="all 0.2s ease"
    >
      {children}
    </ChakraLink>
  )
}

export default function ChakraNavigationFixed() {
  const { user, logout, loading } = useAuth()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  const navBg = useColorModeValue('white', 'neutral.800')
  const navBorder = useColorModeValue('neutral.200', 'neutral.700')
  const logoGradient = useColorModeValue('linear(to-r, neutral.900, brand.600)', 'linear(to-r, neutral.100, brand.400)')

  // Fix hydration by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleLogout = async () => {
    await logout()
    onClose()
    setMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Use consistent content during SSR
  if (loading || !isClient) {
    return (
      <Box bg={navBg} boxShadow="0 1px 3px rgba(0, 0, 0, 0.1)" borderBottom="1px" borderColor={navBorder} mb={8}>
        <Container maxW="7xl">
          <Flex h={16} alignItems="center" justifyContent="space-between">
            <HStack spacing={8} alignItems="center">
              <ChakraLink as={Link} href="/" _hover={{ textDecoration: 'none' }}>
                <Text 
                  fontWeight="bold" 
                  fontSize="xl" 
                  bgGradient={logoGradient}
                  bgClip="text"
                >
                  Squad College Football Picks
                </Text>
              </ChakraLink>
            </HStack>
            <Skeleton height="20px" width="80px" />
          </Flex>
        </Container>
      </Box>
    )
  }

  return (
    <Box bg={navBg} boxShadow="0 1px 3px rgba(0, 0, 0, 0.1)" borderBottom="1px" borderColor={navBorder} mb={{ base: 4, sm: 8 }}>
      <Container maxW="7xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          {/* Logo */}
          <HStack spacing={8} alignItems="center">
            <ChakraLink as={Link} href="/" _hover={{ textDecoration: 'none' }}>
              <Text 
                fontWeight="bold" 
                fontSize={{ base: 'lg', sm: 'xl' }} 
                bgGradient={logoGradient}
                bgClip="text"
              >
                Squad College Football Picks
              </Text>
            </ChakraLink>
            
            {/* Desktop Navigation */}
            <HStack as="nav" spacing={2} display={{ base: 'none', md: 'flex' }}>
              {user && (
                <>
                  <NavLink href="/picks">Picks</NavLink>
                  <NavLink href="/games">Games</NavLink>
                  <NavLink href="/sidebets">💰 Side Bets</NavLink>
                  <NavLink href="/leaderboard">Leaderboard</NavLink>
                  <NavLink href="/history">History</NavLink>
                  <NavLink href="/settings">Settings</NavLink>
                  {user.isAdmin && (
                    <NavLink href="/admin">
                      <HStack spacing={1}>
                        <Text>Admin</Text>
                        <Badge colorScheme="red" size="sm">ADMIN</Badge>
                      </HStack>
                    </NavLink>
                  )}
                </>
              )}
            </HStack>
          </HStack>

          {/* User Menu / Auth */}
          <Flex alignItems="center" gap={2}>
            <DarkModeToggle />
            {user ? (
              <>
                {/* Desktop User Menu */}
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
                      <Text fontSize="sm" fontWeight="medium">
                        {user.name || user.email}
                      </Text>
                    </HStack>
                  </MenuButton>
                  <MenuList>
                    <MenuItem as={Link} href="/picks">Picks</MenuItem>
                    <MenuItem as={Link} href="/games">Games</MenuItem>
                    <MenuItem as={Link} href="/leaderboard">Leaderboard</MenuItem>
                    <MenuItem as={Link} href="/history">History</MenuItem>
                    <MenuItem as={Link} href="/settings">Settings</MenuItem>
                    {user.isAdmin && (
                      <MenuItem as={Link} href="/admin" color="red.500">
                        Admin
                      </MenuItem>
                    )}
                    <MenuItem onClick={handleLogout} color="red.500">
                      Logout
                    </MenuItem>
                  </MenuList>
                </Menu>

                {/* Mobile Menu Button */}
                <IconButton
                  size="md"
                  icon={mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
                  aria-label="Open Menu"
                  display={{ md: 'none' }}
                  onClick={toggleMobileMenu}
                  variant="ghost"
                />
              </>
            ) : (
              <HStack spacing={4}>
                <Button as={Link} href="/auth/login" variant="ghost" size="sm">
                  Login
                </Button>
                <Button as={Link} href="/auth/register" bg="neutral.900" color="white" _hover={{ bg: 'neutral.800' }} size="sm">
                  Sign Up
                </Button>
              </HStack>
            )}
          </Flex>
        </Flex>

        {/* Mobile Navigation Menu */}
        {user && mobileMenuOpen && (
          <Box pb={4} display={{ md: 'none' }}>
            <Stack as="nav" spacing={4}>
              <Flex align="center" p={2}>
                <Avatar size="sm" name={user.name || user.email} mr={3} />
                <Text fontSize="sm" fontWeight="medium">
                  {user.name || user.email}
                </Text>
              </Flex>
              <NavLink href="/picks">Picks</NavLink>
              <NavLink href="/games">Games</NavLink>
              <NavLink href="/sidebets">💰 Side Bets</NavLink>
              <NavLink href="/leaderboard">Leaderboard</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/settings">Settings</NavLink>
              {user.isAdmin && (
                <NavLink href="/admin">
                  <HStack spacing={2}>
                    <Text>Admin</Text>
                    <Badge colorScheme="red" size="sm">ADMIN</Badge>
                  </HStack>
                </NavLink>
              )}
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