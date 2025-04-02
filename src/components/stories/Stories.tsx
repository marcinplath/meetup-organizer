import React, { useState, useEffect } from 'react'
import {
  Box,
  HStack,
  VStack,
  Avatar,
  Text,
  useDisclosure,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useToast,
  Circle,
  Flex,
  Button,
  ModalFooter
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { AddStory } from './AddStory'

interface UserData {
  id: string
  name: string
  avatar_url: string | null
}

interface Story {
  id: string
  content: string
  created_at: string
  user_id: string
  user: UserData[]
}

export const Stories: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { user } = useAuth()
  const toast = useToast()

  const getUserData = (story: Story): UserData | null => {
    if (!story.user || !Array.isArray(story.user) || story.user.length === 0) {
      return null
    }
    return story.user[0]
  }

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          content,
          created_at,
          user_id,
          user:users (
            id,
            name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Debugowanie struktury danych
      console.log('Otrzymane dane:', data)
      
      // Sprawdzamy i mapujemy dane
      const validStories = (data || []).filter(story => story && story.user).map(story => ({
        ...story,
        user: Array.isArray(story.user) ? story.user : [story.user]
      }))
      
      setStories(validStories)
    } catch (error) {
      console.error('Błąd podczas pobierania notatek:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać notatek',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedStory || !user || selectedStory.user_id !== user.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', selectedStory.id)

      if (error) throw error

      toast({
        title: 'Notatka usunięta',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      setSelectedStory(null)
      fetchStories()
    } catch (error) {
      console.error('Błąd podczas usuwania notatki:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć notatki',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    fetchStories()

    const storiesSubscription = supabase
      .channel('stories_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'stories' 
        }, 
        () => {
          fetchStories()
        }
      )
      .subscribe()

    return () => {
      storiesSubscription.unsubscribe()
    }
  }, [])

  return (
    <Box>
      <HStack spacing={4} overflowX="auto" p={2} css={{
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        'scrollbarWidth': 'none'
      }}>
        {/* Przycisk dodawania nowej notatki */}
        <VStack spacing={2}>
          <Box position="relative">
            <IconButton
              aria-label="Dodaj notatkę"
              icon={<AddIcon />}
              onClick={onOpen}
              rounded="full"
              size="lg"
              colorScheme="blue"
            />
          </Box>
          <Text fontSize="sm" color="gray.400">
            Dodaj
          </Text>
        </VStack>

        {/* Lista notatek */}
        {stories.map((story) => {
          const userData = getUserData(story)
          if (!userData) return null // Pomijamy notatki bez danych użytkownika
          
          return (
            <VStack key={story.id} spacing={2}>
              <Box position="relative" cursor="pointer" onClick={() => setSelectedStory(story)}>
                <Circle
                  size="56px"
                  bg="gradient"
                  bgGradient="linear(to-r, blue.400, purple.500)"
                  position="absolute"
                  top="-2px"
                  left="-2px"
                  right="-2px"
                  bottom="-2px"
                />
                <Avatar
                  size="lg"
                  name={userData.name}
                  src={userData.avatar_url || undefined}
                  position="relative"
                />
              </Box>
              <Text fontSize="sm" color="gray.300" noOfLines={1}>
                {userData.name}
              </Text>
            </VStack>
          )
        })}
      </HStack>

      {/* Modal dodawania nowej notatki */}
      <AddStory 
        isOpen={isOpen} 
        onClose={onClose}
        onStoryAdded={fetchStories}
      />

      {/* Modal wyświetlania notatki */}
      <Modal 
        isOpen={!!selectedStory} 
        onClose={() => setSelectedStory(null)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg="gray.800" maxW="sm">
          <ModalBody p={6}>
            <VStack spacing={4} align="stretch">
              <Flex align="center" gap={3}>
                {selectedStory && getUserData(selectedStory) && (
                  <>
                    <Avatar
                      size="sm"
                      name={getUserData(selectedStory)?.name || ''}
                      src={getUserData(selectedStory)?.avatar_url || undefined}
                    />
                    <Text color="white" fontWeight="bold">
                      {getUserData(selectedStory)?.name || ''}
                    </Text>
                  </>
                )}
              </Flex>
              <Text color="gray.100" fontSize="lg">
                {selectedStory?.content}
              </Text>
            </VStack>
          </ModalBody>
          {selectedStory && user && selectedStory.user_id === user.id && (
            <ModalFooter>
              <Button
                leftIcon={<DeleteIcon />}
                colorScheme="red"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Usuń notatkę
              </Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    </Box>
  )
} 