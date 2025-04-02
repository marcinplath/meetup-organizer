import React from 'react'
import { Box, Flex, Link, Spacer, Button, useColorMode } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { signOut } = useAuth()
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Box minH="100vh">
      <Flex as="nav" bg="blue.500" color="white" p={4} align="center">
        <Link as={RouterLink} to="/" px={4} fontWeight="bold">
          Strona Główna
        </Link>
        <Link as={RouterLink} to="/events" px={4}>
          Wydarzenia
        </Link>
        <Link as={RouterLink} to="/calendar" px={4}>
          Kalendarz
        </Link>
        <Link as={RouterLink} to="/surveys" px={4}>
          Ankiety
        </Link>
        <Spacer />
        <Button
          onClick={toggleColorMode}
          size="sm"
          variant="ghost"
          mr={4}
        >
          {colorMode === 'light' ? '🌙' : '☀️'}
        </Button>
        <Button
          onClick={signOut}
          colorScheme="blue"
          variant="outline"
          size="sm"
        >
          Wyloguj
        </Button>
      </Flex>
      <Box p={4}>
        {children}
      </Box>
    </Box>
  )
}

export default Layout 