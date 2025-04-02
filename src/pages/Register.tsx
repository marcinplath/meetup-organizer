import React, { useState } from 'react'
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
  Alert,
  AlertIcon,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  IconButton,
  Container
} from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'

const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE
const MAX_REGISTRATION_ATTEMPTS = parseInt(import.meta.env.VITE_MAX_REGISTRATION_ATTEMPTS || '3')
const REGISTRATION_COOLDOWN_MINUTES = parseInt(import.meta.env.VITE_REGISTRATION_COOLDOWN_MINUTES || '30')

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accessCode: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registrationAttempts, setRegistrationAttempts] = useState(0)
  const [lastAttemptTime, setLastAttemptTime] = useState<Date | null>(null)
  const toast = useToast()
  const navigate = useNavigate()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Imię i nazwisko jest wymagane'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email jest wymagany'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Nieprawidłowy format emaila'
    }

    if (!formData.password) {
      newErrors.password = 'Hasło jest wymagane'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Hasło musi mieć minimum 8 znaków'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Hasło musi zawierać wielką literę, małą literę i cyfrę'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Potwierdzenie hasła jest wymagane'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Hasła nie są identyczne'
    }

    if (!formData.accessCode) {
      newErrors.accessCode = 'Kod dostępu jest wymagany'
    } else if (formData.accessCode !== ACCESS_CODE) {
      newErrors.accessCode = 'Nieprawidłowy kod dostępu'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Wyczyść błąd dla danego pola po rozpoczęciu edycji
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Sprawdź cooldown i liczbę prób
    const now = new Date()
    if (lastAttemptTime) {
      const minutesSinceLastAttempt = (now.getTime() - lastAttemptTime.getTime()) / (1000 * 60)
      if (minutesSinceLastAttempt < REGISTRATION_COOLDOWN_MINUTES) {
        const remainingMinutes = Math.ceil(REGISTRATION_COOLDOWN_MINUTES - minutesSinceLastAttempt)
        toast({
          title: 'Zbyt wiele prób',
          description: `Spróbuj ponownie za ${remainingMinutes} minut`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        return
      }
    }

    if (registrationAttempts >= MAX_REGISTRATION_ATTEMPTS) {
      toast({
        title: 'Przekroczono limit prób',
        description: `Spróbuj ponownie za ${REGISTRATION_COOLDOWN_MINUTES} minut`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)

    try {
      // Sprawdź czy to będzie pierwszy użytkownik
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        throw countError
      }

      // Zarejestruj użytkownika w auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            is_admin: count === 0,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Nie udało się utworzyć użytkownika')
      }

      // Resetuj licznik prób po udanej rejestracji
      setRegistrationAttempts(0)
      setLastAttemptTime(null)

      toast({
        title: 'Konto utworzone pomyślnie!',
        description: 'Sprawdź swoją skrzynkę email, aby potwierdzić rejestrację.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      navigate('/login')
    } catch (error: any) {
      console.error('Błąd rejestracji:', error)
      
      // Zwiększ licznik prób
      setRegistrationAttempts(prev => prev + 1)
      setLastAttemptTime(now)

      let errorMessage = 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.'
      
      if (error.message?.includes('email already registered')) {
        errorMessage = 'Ten email jest już zarejestrowany.'
      } else if (error.message?.includes('weak password')) {
        errorMessage = 'Hasło jest zbyt słabe. Użyj silniejszego hasła.'
      } else if (error.message?.includes('invalid email')) {
        errorMessage = 'Nieprawidłowy format adresu email.'
      }

      toast({
        title: 'Błąd rejestracji',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box maxW="500px" mx="auto">
      <VStack spacing={4} align="stretch">
        <Heading textAlign="center">Rejestracja</Heading>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.name}>
              <FormLabel>Imię i nazwisko</FormLabel>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Wprowadź swoje imię i nazwisko"
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Wprowadź swój email"
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Hasło</FormLabel>
              <InputGroup>
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Wprowadź hasło"
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
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel>Potwierdź hasło</FormLabel>
              <InputGroup>
                <Input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Potwierdź hasło"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    variant="ghost"
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.accessCode}>
              <FormLabel>Kod dostępu</FormLabel>
              <Input
                name="accessCode"
                type="text"
                value={formData.accessCode}
                onChange={handleInputChange}
                placeholder="Wprowadź kod dostępu"
              />
              <FormErrorMessage>{errors.accessCode}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
            >
              Zarejestruj się
            </Button>
          </VStack>
        </form>
        <Text textAlign="center">
          Masz już konto?{' '}
          <ChakraLink as={RouterLink} to="/login" color="blue.500">
            Zaloguj się
          </ChakraLink>
        </Text>
      </VStack>
    </Box>
  )
}

export default Register 