import React from 'react'
import { Box, Container, useColorModeValue } from '@chakra-ui/react'
import { Navbar } from './Navbar'

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900')

  return (
    <Box 
      minH="100vh" 
      bg={bgColor}
      width="100%"
      overflowX="hidden"
    >
      <Navbar />
      <Container 
        maxW="container.xl" 
        pt={{ base: "80px", md: "100px", lg: "120px" }} 
        pb={{ base: 8, md: 12 }} 
        px={{ base: 4, md: 6, lg: 8 }}
        width="100%"
      >
        {children}
      </Container>
    </Box>
  )
}

export default MainLayout 