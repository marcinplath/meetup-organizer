import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Heading, Spinner, Text, VStack } from '@chakra-ui/react'
import { handleEmailConfirmation } from '../lib/supabase'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuth = async () => {
      try {
        console.log('[AuthCallback] Rozpoczynam potwierdzanie emaila...')
        await handleEmailConfirmation()
        console.log('[AuthCallback] Email potwierdzony pomyślnie')
        
        // Przekieruj do strony logowania z informacją o sukcesie
        navigate('/login', { 
          state: { 
            message: 'Email został potwierdzony. Możesz się teraz zalogować.',
            type: 'success'
          },
          replace: true
        })
      } catch (err: any) {
        console.error('[AuthCallback] Błąd podczas potwierdzania emaila:', err)
        setError(err.message || 'Wystąpił błąd podczas potwierdzania emaila')
      }
    }

    handleAuth()
  }, [navigate])

  if (error) {
    return (
      <Box p={8} maxWidth="500px" mx="auto">
        <VStack spacing={4} align="center">
          <Heading size="md" color="red.500">Błąd potwierdzenia</Heading>
          <Text textAlign="center">{error}</Text>
        </VStack>
      </Box>
    )
  }

  return (
    <Box p={8} maxWidth="500px" mx="auto">
      <VStack spacing={4} align="center">
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text fontSize="lg">Potwierdzanie emaila...</Text>
        <Text color="gray.500" fontSize="sm">To może potrwać kilka sekund</Text>
      </VStack>
    </Box>
  )
}

export default AuthCallback 