import React from 'react'
import {
  Box,
  Flex,
  Avatar,
  HStack,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useDisclosure,
  useColorModeValue,
  Stack,
  useColorMode,
  Text,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Spinner,
} from '@chakra-ui/react'
import { HamburgerIcon, CloseIcon, MoonIcon, SunIcon } from '@chakra-ui/icons'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface NavLinkProps {
  children: React.ReactNode
  to: string
}

const NavLink = ({ children, to }: NavLinkProps) => {
  const location = useLocation()
  const isActive = location.pathname === to
  const activeColor = useColorModeValue('white', 'white')
  const inactiveColor = useColorModeValue('gray.600', 'gray.200')

  return (
    <Link to={to}>
      <Button
        variant={isActive ? "solid" : "ghost"}
        colorScheme={isActive ? "blue" : undefined}
        color={isActive ? activeColor : inactiveColor}
        _hover={{
          bg: isActive ? 'blue.500' : 'gray.100',
          color: isActive ? 'white' : 'gray.800'
        }}
      >
        {children}
      </Button>
    </Link>
  )
}

interface DrawerNavItemProps extends NavLinkProps {
  onClose: () => void
}

const DrawerNavItem = ({ children, to, onClose }: DrawerNavItemProps) => {
  const location = useLocation()
  const isActive = location.pathname === to
  const activeColor = useColorModeValue('white', 'white')
  const inactiveColor = useColorModeValue('gray.600', 'gray.200')

  return (
    <Link to={to} onClick={onClose}>
      <Button
        variant={isActive ? "solid" : "ghost"}
        colorScheme={isActive ? "blue" : undefined}
        color={isActive ? activeColor : inactiveColor}
        width="100%"
        justifyContent="flex-start"
        _hover={{
          bg: isActive ? 'blue.500' : 'gray.100',
          color: isActive ? 'white' : 'gray.800'
        }}
      >
        {children}
      </Button>
    </Link>
  )
}

export const Navbar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { colorMode, toggleColorMode } = useColorMode()
  const { user, profile, loading, signOut } = useAuth()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const dividerColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <Box
      as="nav"
      position="fixed"
      top="0"
      left="0"
      right="0"
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={{ base: 4, md: 8 }}
      py={2}
      zIndex={100}
      height={{ base: "60px", md: "64px" }}
      display="flex"
      alignItems="center"
    >
      <Flex 
        justify="space-between" 
        align="center" 
        maxW="container.xl" 
        mx="auto"
        w="100%"
      >
        <Link to="/">
          <Box 
            fontSize="xl" 
            fontWeight="bold"
            lineHeight="normal"
          >
            Meetup Organizer
          </Box>
        </Link>

        <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
          {loading ? (
            <Spinner size="sm" color="blue.500" />
          ) : user ? (
            <>
              <NavLink to="/events">Wydarzenia</NavLink>
              <NavLink to="/calendar">Kalendarz</NavLink>
              <NavLink to="/surveys">Ankiety</NavLink>
            </>
          ) : null}
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
          />
          {loading ? null : user ? (
            <Menu>
              <MenuButton
                as={Button}
                rounded={'full'}
                variant={'link'}
                cursor={'pointer'}
                minW={0}
              >
                <Avatar
                  size={'sm'}
                  src={profile?.avatar_url ?? undefined}
                  name={profile?.name ?? 'Użytkownik'}
                />
              </MenuButton>
              <MenuList>
                <Link to="/profile">
                  <MenuItem>Profil</MenuItem>
                </Link>
                <MenuDivider />
                <MenuItem onClick={signOut}>Wyloguj się</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <HStack spacing={4}>
              <Link to="/login">
                <Button variant="ghost">Zaloguj się</Button>
              </Link>
              <Link to="/register">
                <Button colorScheme="blue">Dołącz do nas</Button>
              </Link>
            </HStack>
          )}
        </HStack>

        <IconButton
          aria-label="Open menu"
          icon={<HamburgerIcon />}
          onClick={onOpen}
          display={{ base: 'flex', md: 'none' }}
          variant="ghost"
        />
      </Flex>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menu</DrawerHeader>

          <DrawerBody>
            <Stack spacing={4}>
              {loading ? (
                <Flex justify="center" py={8}>
                  <Spinner size="lg" color="blue.500" />
                </Flex>
              ) : user ? (
                <>
                  <Box>
                    <Flex align="center" mb={6}>
                      <Avatar
                        size="md"
                        src={profile?.avatar_url ?? undefined}
                        name={profile?.name ?? 'Użytkownik'}
                        mr={3}
                      />
                      <Box>
                        <Text fontWeight="bold">{profile?.name ?? 'Użytkownik'}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {profile?.email}
                        </Text>
                      </Box>
                    </Flex>
                  </Box>
                  <DrawerNavItem to="/events" onClose={onClose}>
                    Wydarzenia
                  </DrawerNavItem>
                  <DrawerNavItem to="/calendar" onClose={onClose}>
                    Kalendarz
                  </DrawerNavItem>
                  <DrawerNavItem to="/surveys" onClose={onClose}>
                    Ankiety
                  </DrawerNavItem>
                  <DrawerNavItem to="/profile" onClose={onClose}>
                    Profil
                  </DrawerNavItem>
                  <Button onClick={signOut} width="100%" mt={4}>
                    Wyloguj się
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button width="100%" variant="ghost">
                      Zaloguj się
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button width="100%" colorScheme="blue">
                      Dołącz do nas
                    </Button>
                  </Link>
                </>
              )}
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  )
} 