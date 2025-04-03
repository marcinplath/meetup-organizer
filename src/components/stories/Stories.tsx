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
  ModalFooter,
  Input,
  useColorModeValue
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon, EditIcon, RepeatIcon } from '@chakra-ui/icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { AddStory } from './AddStory'
import { Story as BaseStory } from '../../types'

interface UserData {
  id: string
  name: string
  avatar_url: string | null
}

// Rozszerzamy interfejs Story dla naszych potrzeb
interface StoryWithUser extends BaseStory {
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  }[];
}

// Komponent dymka z notatką
const NoteBubble: React.FC<{ content: string }> = ({ content }) => {
  const bubbleBg = useColorModeValue('blue.500', 'blue.600')
  const bubbleColor = 'white'

  return (
    <Box position="relative" display="inline-block" zIndex={100}>
      <Box
        bg={bubbleBg}
        color={bubbleColor}
        px={4}
        py={2}
        borderRadius="lg"
        boxShadow="lg"
        maxW="200px"
        _hover={{ bg: 'blue.600' }}
        transition="all 0.2s"
        cursor="pointer"
        zIndex={100}
      >
        <Text fontSize="sm" whiteSpace="pre-wrap" noOfLines={2}>
          {content}
        </Text>
      </Box>
      <Box
        position="absolute"
        bottom="-6px"
        left="50%"
        transform="translateX(-50%)"
        w="0"
        h="0"
        borderStyle="solid"
        borderWidth="6px"
        borderColor={`${bubbleBg} transparent transparent transparent`}
        zIndex={100}
      />
    </Box>
  )
}

export const Stories: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<UserData[]>([])
  const [stories, setStories] = useState<StoryWithUser[]>([])
  const [selectedStory, setSelectedStory] = useState<StoryWithUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { user, profile } = useAuth()
  const toast = useToast()

  const fetchStories = async () => {
    try {
      // Pobieramy wszystkie aktywne notatki
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          content,
          user_id,
          created_at,
          expires_at,
          user:users (
            id,
            name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        throw error;
      }

      // Jeśli nie ma notatek, zakończ
      if (!data || data.length === 0) {
        setStories([]);
        return;
      }

      // Upewnij się, że każda notatka ma właściwy format
      const formattedStories = data.map(story => ({
        ...story,
        user: Array.isArray(story.user) ? story.user : [story.user]
      }));

      setStories(formattedStories);
    } catch (error) {
      console.error('Błąd podczas pobierania notatek:', error);
    }
  }

  const fetchActiveUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .neq('id', user?.id)
        .order('name')

      if (error) throw error
      setActiveUsers(data || [])
    } catch (error) {
      console.error('Błąd podczas pobierania użytkowników:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać listy użytkowników',
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
      // Proste usunięcie notatki
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', selectedStory.id);

      if (error) throw error;

      toast({
        title: 'Notatka usunięta',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Zamknij modal i odśwież dane
      setSelectedStory(null);
      fetchStories();
    } catch (error) {
      console.error('Błąd podczas usuwania notatki:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć notatki',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const handleEdit = async () => {
    if (!selectedStory || !user || selectedStory.user_id !== user.id || !editContent.trim()) {
      console.log('Nie można edytować notatki:', { 
        selectedStory: selectedStory ? 'istnieje' : 'brak', 
        user: user ? 'zalogowany' : 'niezalogowany',
        matchingUser: selectedStory && user ? (selectedStory.user_id === user.id ? 'tak' : 'nie') : 'N/A',
        editContent: editContent ? 'niepusty' : 'pusty'
      });
      return;
    }

    console.log('Rozpoczynam edycję notatki:', {
      id: selectedStory.id,
      user_id: selectedStory.user_id,
      content_before: selectedStory.content,
      content_after: editContent.trim()
    });

    try {
      // Utwórz datę wygaśnięcia - 24h od teraz
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      console.log('Nowa data wygaśnięcia:', expiresAt.toISOString());
      
      // Sprawdź, czy notatka wciąż istnieje
      const { data: existingStory, error: checkError } = await supabase
        .from('stories')
        .select('id')
        .eq('id', selectedStory.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('Błąd podczas sprawdzania istnienia notatki:', checkError);
        throw checkError;
      }
      
      if (!existingStory) {
        console.error('Notatka nie istnieje lub została usunięta');
        throw new Error('Notatka nie istnieje lub została usunięta');
      }
      
      // Wykonaj aktualizację treści notatki i daty wygaśnięcia
      const { data, error } = await supabase
        .from('stories')
        .update({
          content: editContent.trim(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', selectedStory.id)
        .select();

      if (error) {
        console.error('Błąd podczas aktualizacji:', error);
        throw error;
      }

      console.log('Zaktualizowana notatka:', data);

      // Sprawdź czy aktualizacja się powiodła
      if (!data || data.length === 0) {
        console.error('Aktualizacja nie zwróciła danych');
        throw new Error('Aktualizacja nie zwróciła danych');
      }

      // Wyświetl powiadomienie o sukcesie
      toast({
        title: 'Notatka zaktualizowana',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Zamknij modal i wyczyść stan
      setSelectedStory(null);
      setIsEditing(false);
      setEditContent('');
      
      // Pobierz zaktualizowane notatki
      await fetchStories();
    } catch (error: any) {
      console.error('Błąd podczas aktualizacji notatki:', error);
      
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zaktualizować notatki',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }

  const getUserStory = (userId: string) => {
    if (!stories.length) {
      return null;
    }
    
    // Znajduje notatkę dla danego użytkownika
    const foundStory = stories.find(story => story.user_id === userId);
    return foundStory;
  }

  useEffect(() => {
    fetchActiveUsers()
    fetchStories()

    const subscription = supabase
      .channel('stories_changes')
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
      subscription.unsubscribe()
    }
  }, [user?.id])

  // Komponent avatara użytkownika
  const UserAvatar: React.FC<{ userData: UserData }> = ({ userData }) => {
    const story = getUserStory(userData.id)
    const isCurrentUser = user?.id === userData.id

    return (
      <VStack spacing={2} position="relative">
        {/* Notatka nad avatarem */}
        {story && (
          <Box
            position="absolute"
            top="-50px"
            left="50%"
            transform="translateX(-50%)"
            onClick={() => {
              setSelectedStory(story)
              setEditContent(story.content)
            }}
            zIndex={100}
            width="max-content"
            pointerEvents="auto"
          >
            <NoteBubble content={story.content} />
          </Box>
        )}
        
        {/* Avatar użytkownika */}
        <Box position="relative">
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
          {/* Przycisk dodawania notatki */}
          {isCurrentUser && !story && (
            <IconButton
              aria-label="Dodaj notatkę"
              icon={<AddIcon />}
              onClick={() => {
                onOpen();
              }}
              size="sm"
              colorScheme="blue"
              position="absolute"
              top="-2"
              right="-2"
              rounded="full"
            />
          )}
        </Box>
        <Text fontSize="sm" color="gray.300" noOfLines={1}>
          {userData.name}
        </Text>
      </VStack>
    )
  }

  // Prosty komponent modal - tylko usuwanie, bez edycji
  const StoryModal = () => {
    if (!selectedStory) return null;
    
    return (
      <Modal 
        isOpen={!!selectedStory} 
        onClose={() => {
          setSelectedStory(null)
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg="gray.800" maxW="sm">
          <ModalBody p={6}>
            <VStack spacing={4} align="stretch">
              <Flex align="center" gap={3}>
                {selectedStory.user && selectedStory.user[0] && (
                  <>
                    <Avatar
                      size="sm"
                      name={selectedStory.user[0].name}
                      src={selectedStory.user[0].avatar_url || undefined}
                    />
                    <Text color="white" fontWeight="bold">
                      {selectedStory.user[0].name}
                    </Text>
                  </>
                )}
              </Flex>
              <Text color="gray.100" fontSize="lg">
                {selectedStory.content}
              </Text>
              <Text color="gray.400" fontSize="xs">
                Wygasa: {new Date(selectedStory.expires_at).toLocaleString('pl-PL')}
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
                Usuń
              </Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Box mt={20} overflow="visible" position="relative" zIndex={1} minHeight="150px">
      <HStack spacing={4} overflowX="auto" p={2} position="relative" css={{
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        'scrollbarWidth': 'none'
      }}>
        {/* Avatar zalogowanego użytkownika */}
        {profile && (
          <Box position="relative" overflow="visible" mt="50px" mb="10px">
            <UserAvatar userData={{
              id: profile.id,
              name: profile.name || '',
              avatar_url: profile.avatar_url || null
            }} />
          </Box>
        )}

        {/* Separator */}
        <Box borderLeft="1px" borderColor="gray.600" height="70px" mt="50px" />

        {/* Lista innych użytkowników */}
        <HStack spacing={4}>
          {activeUsers.map((userData) => (
            <Box key={userData.id} position="relative" overflow="visible" mt="50px" mb="10px">
              <UserAvatar userData={userData} />
            </Box>
          ))}
        </HStack>
      </HStack>

      {/* Modal dodawania nowej notatki */}
      <AddStory 
        isOpen={isOpen} 
        onClose={onClose}
        onStoryAdded={fetchStories}
      />

      {/* Modal wyświetlania notatki */}
      <StoryModal />
    </Box>
  )
} 