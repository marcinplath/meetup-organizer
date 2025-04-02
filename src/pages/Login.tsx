import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Link as ChakraLink,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
  Container
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const MAX_LOGIN_ATTEMPTS = 3
const LOCK_TIME = 15 // minuty

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState(0)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Obsługa komunikatów z innych stron
  useEffect(() => {
    const state = location.state as { message?: string; type?: string }
    if (state?.message) {
      toast({
        title: state.message,
        status: state.type as any || 'info',
        duration: 5000,
        isClosable: true,
      })
      // Czyścimy stan aby komunikat nie pokazał się ponownie po odświeżeniu
      navigate(location.pathname, { replace: true })
    }
  }, [location, navigate, toast])

  // Sprawdzanie blokady logowania
  useEffect(() => {
    const checkLockStatus = () => {
      const storageKey = `login_lock_${email.toLowerCase()}`
      const lockData = localStorage.getItem(storageKey)
      
      if (lockData) {
        const { timestamp, attempts } = JSON.parse(lockData)
        const now = new Date().getTime()
        const timePassed = (now - timestamp) / 1000 / 60 // w minutach
        
        if (attempts >= MAX_LOGIN_ATTEMPTS && timePassed < LOCK_TIME) {
          setIsLocked(true)
          setMinutesLeft(Math.ceil(LOCK_TIME - timePassed))
        } else if (timePassed >= LOCK_TIME) {
          localStorage.removeItem(storageKey)
          setIsLocked(false)
        }
      }
    }

    const interval = setInterval(checkLockStatus, 1000)
    return () => clearInterval(interval)
  }, [email])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLocked) {
      setError(`Konto jest tymczasowo zablokowane. Spróbuj ponownie za ${minutesLeft} minut.`)
      return
    }
    
    setIsLoading(true)
    setError(null)

    try {
      console.log('[Login] Próba logowania...')
      await signIn(email, password)
      
      // Resetujemy próby logowania po sukcesie
      const storageKey = `login_lock_${email.toLowerCase()}`
      localStorage.removeItem(storageKey)
      
      console.log('[Login] Logowanie udane, przekierowuję...')
      navigate('/')
    } catch (err: any) {
      console.error('[Login] Błąd logowania:', err)
      
      // Aktualizujemy licznik prób
      const storageKey = `login_lock_${email.toLowerCase()}`
      const lockData = localStorage.getItem(storageKey)
      const now = new Date().getTime()
      
      let attempts = 1
      if (lockData) {
        const data = JSON.parse(lockData)
        const timePassed = (now - data.timestamp) / 1000 / 60
        
        if (timePassed < LOCK_TIME) {
          attempts = data.attempts + 1
        }
      }
      
      localStorage.setItem(storageKey, JSON.stringify({
        timestamp: now,
        attempts
      }))
      
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        setError(`Przekroczono limit prób logowania. Konto zostało tymczasowo zablokowane na ${LOCK_TIME} minut.`)
        setIsLocked(true)
        setMinutesLeft(LOCK_TIME)
      } else {
        setError(err.message || 'Wystąpił błąd podczas logowania')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxW="container.sm" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" mb={2}>Logowanie</Heading>
          <Text color="gray.600">Zaloguj się do swojego konta</Text>
        </Box>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <VStack spacing={4}>
            <FormControl id="email">
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormControl>

            <FormControl id="password">
              <FormLabel>Hasło</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
              isDisabled={isLocked}
            >
              Zaloguj się
            </Button>
          </VStack>
        </form>

        <Text textAlign="center">
          Nie masz jeszcze konta?{' '}
          <ChakraLink as={RouterLink} to="/register" color="blue.500">
            Zarejestruj się
          </ChakraLink>
        </Text>
      </VStack>
    </Container>
  )
}

export default Login 