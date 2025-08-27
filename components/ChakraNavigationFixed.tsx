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

const NavLink = ({ children, href, isActive = false }: { 
  children: React.ReactNode, 
  href: string, 
  isActive?: boolean 
}) => (
  <ChakraLink
    as={Link}
    href={href}
    px={2}
    py={1}
    rounded={'md'}
    color={isActive ? 'primary' : 'gray.600'}
    fontWeight={isActive ? 'bold' : 'medium'}
    _hover={{
      textDecoration: 'none',
      bg: 'gray.100',
      color: 'primary',
    }}
    transition="all 0.2s"
  >
    {children}
  </ChakraLink>
)

export default function ChakraNavigationFixed() {
  const { user, logout, loading } = useAuth()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)

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
      <Box bg="white" boxShadow="sm" borderBottom="1px" borderColor="gray.200" mb={8}>
        <Container maxW="7xl">
          <Flex h={16} alignItems="center" justifyContent="space-between">
            <HStack spacing={8} alignItems="center">
              <ChakraLink as={Link} href="/" _hover={{ textDecoration: 'none' }}>
                <Text fontWeight="bold" fontSize="xl" color="gray.900">
                  🎯 Squad College Football Picks
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
    <Box bg="white" boxShadow="sm" borderBottom="1px" borderColor="gray.200" mb={{ base: 4, sm: 8 }}>
      <Container maxW="7xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          {/* Logo */}
          <HStack spacing={8} alignItems="center">
            <ChakraLink as={Link} href="/" _hover={{ textDecoration: 'none' }}>
              <Text fontWeight="bold" fontSize={{ base: 'lg', sm: 'xl' }} color="gray.900">
                🎯 Squad College Football Picks
              </Text>
            </ChakraLink>
            
            {/* Desktop Navigation */}
            <HStack as="nav" spacing={4} display={{ base: 'none', md: 'flex' }}>
              {user && (
                <>
                  <NavLink href="/picks">Pick Tracker</NavLink>
                  <NavLink href="/games">Weekly Games</NavLink>
                  <NavLink href="/leaderboard">Leaderboard</NavLink>
                  <NavLink href="/history">Historical Leaderboards</NavLink>
                  {user.isAdmin && (
                    <NavLink href="/admin">
                      <HStack spacing={1}>
                        <Text>Admin Panel</Text>
                        <Badge colorScheme="red" size="sm">ADMIN</Badge>
                      </HStack>
                    </NavLink>
                  )}
                </>
              )}
            </HStack>
          </HStack>

          {/* User Menu / Auth */}
          <Flex alignItems="center">
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
                    <MenuItem as={Link} href="/picks">Pick Tracker</MenuItem>
                    <MenuItem as={Link} href="/games">Weekly Games</MenuItem>
                    <MenuItem as={Link} href="/leaderboard">Leaderboard</MenuItem>
                    <MenuItem as={Link} href="/history">Historical Leaderboards</MenuItem>
                    {user.isAdmin && (
                      <MenuItem as={Link} href="/admin" color="red.500">
                        Admin Panel
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
                <Button as={Link} href="/auth/register" colorScheme="football" size="sm">
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
              <NavLink href="/picks">Pick Tracker</NavLink>
              <NavLink href="/games">Weekly Games</NavLink>
              <NavLink href="/leaderboard">Leaderboard</NavLink>
              <NavLink href="/history">Historical Leaderboards</NavLink>
              {user.isAdmin && (
                <NavLink href="/admin">
                  <HStack spacing={2}>
                    <Text>Admin Panel</Text>
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