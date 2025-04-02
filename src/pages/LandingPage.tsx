import React from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Image,
  useColorModeValue,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'

const LandingPage: React.FC = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBgColor = useColorModeValue('white', 'gray.800')

  return (
    <Box bg={bgColor} minH="100vh" py={20}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          <Box textAlign="center" py={10}>
            <Heading as="h1" size="2xl" mb={4}>
              Witaj w Meetup Organizer
            </Heading>
            <Text fontSize="xl" color="gray.600" mb={8}>
              Organizuj spotkania z przyjaciółmi w prosty i efektywny sposób
            </Text>
            <Button
              as={RouterLink}
              to="/register"
              colorScheme="blue"
              size="lg"
              mr={4}
            >
              Dołącz do nas
            </Button>
            <Button
              as={RouterLink}
              to="/login"
              variant="outline"
              size="lg"
            >
              Zaloguj się
            </Button>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}

export default LandingPage 