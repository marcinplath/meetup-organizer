import React, { useState } from 'react'
import { Box, Spinner, Center, VStack, Text, Button, useToast } from '@chakra-ui/react'
import { clearSession } from '../../lib/supabase'

const LoadingScreen: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false)
  const toast = useToast()

  const handleClearSession = async () => {
    try {
      setIsClearing(true)
      await clearSession()
    } catch (error) {
      console.error('Błąd:', error)
      toast({
        title: 'Błąd podczas czyszczenia sesji',
        description: 'Spróbuj odświeżyć stronę ręcznie',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Center h="100vh" w="100%" bg="white">
      <VStack spacing={6}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text fontSize="lg" color="gray.600">Ładowanie...</Text>
        <Button
          colorScheme="red"
          size="sm"
          onClick={handleClearSession}
          isLoading={isClearing}
          loadingText="Czyszczenie..."
          mt={4}
        >
          Wyczyść sesję
        </Button>
      </VStack>
    </Center>
  )
}

export default LoadingScreen 