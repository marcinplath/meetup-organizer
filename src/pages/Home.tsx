import React, { useEffect, useState } from 'react'
import { 
  Box, 
  Heading, 
  Avatar, 
  Wrap, 
  WrapItem, 
  Text, 
  Tooltip, 
  VStack, 
  useColorModeValue, 
  Flex,
  Icon,
  Skeleton,
  Circle,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Input,
  HStack
} from '@chakra-ui/react'
import { CalendarIcon, ViewIcon, StarIcon, EditIcon } from '@chakra-ui/icons'
import { FaUser } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Stories } from '../components/stories/Stories'
import { AddStory } from '../components/stories/AddStory'
import { DeleteIcon, AddIcon } from '@chakra-ui/icons'
import { useToast } from '@chakra-ui/react'

interface User {
  id: string
  name: string
  avatar_url: string
  last_seen: string
}

interface Story {
  id: string
  content: string
  created_at: string
  user_id: string
  user: {
    id: string
    name: string
    avatar_url: string | null
  }[]
}

const NoteBubble: React.FC<{ content: string }> = ({ content }) => {
  const bubbleBg = useColorModeValue('blue.500', 'blue.600')
  const bubbleColor = 'white'

  return (
    <Box position="relative" display="inline-block">
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
      />
    </Box>
  )
}

export const Home: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.200', 'gray.600')
  const textColor = useColorModeValue('gray.600', 'gray.300')
  const headingColor = useColorModeValue('gray.700', 'white')
  const toast = useToast()

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, last_seen')
        .order('name')

      if (error) throw error
      setUsers(data || [])
      setIsLoading(false)
    } catch (error) {
      console.error('Błąd podczas pobierania użytkowników:', error)
      setIsLoading(false)
    }
  }

  const fetchStories = async () => {
    try {
      console.log('Pobieranie notatek...')
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
      
      console.log('Otrzymane dane:', data)
      
      const validStories = (data || []).filter(story => story && story.user).map(story => ({
        ...story,
        user: Array.isArray(story.user) ? story.user : [story.user]
      }))
      
      console.log('Przetworzone notatki:', validStories)
      setStories(validStories)
    } catch (error) {
      console.error('Błąd podczas pobierania notatek:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedStory || !currentUser || selectedStory.user_id !== currentUser.id) return

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

  const handleEdit = async () => {
    if (!selectedStory || !currentUser || selectedStory.user_id !== currentUser.id || !editContent.trim()) return

    try {
      const { error } = await supabase
        .from('stories')
        .update({ content: editContent.trim() })
        .eq('id', selectedStory.id)

      if (error) throw error

      toast({
        title: 'Notatka zaktualizowana',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      setSelectedStory(null)
      setIsEditing(false)
      setEditContent('')
      fetchStories()
    } catch (error) {
      console.error('Błąd podczas aktualizacji notatki:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować notatki',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const isUserActive = (lastSeen: string) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return new Date(lastSeen) > fiveMinutesAgo
  }

  const getUserStory = (userId: string) => {
    return stories.find(story => story.user_id === userId)
  }

  useEffect(() => {
    fetchUsers()
    fetchStories()

    const usersSubscription = supabase
      .channel('users_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'users' 
        }, 
        () => {
          fetchUsers()
        }
      )
      .subscribe()

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

    const interval = setInterval(() => {
      fetchUsers()
      fetchStories()
    }, 30000)

    return () => {
      usersSubscription.unsubscribe()
      storiesSubscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return (
    <VStack spacing={8} align="stretch">
      <Box textAlign="center" py={10}>
        <Heading as="h1" size="2xl" mb={4} color={headingColor}>
          Meetup Organizer
        </Heading>
        <Text fontSize="xl" color={textColor}>
          Organizuj spotkania z przyjaciółmi w prosty i efektywny sposób
        </Text>
      </Box>

      <Box>
        <Heading size="lg" mb={4} color={headingColor}>
          Ziomale/ziomalki
        </Heading>
        {isLoading ? (
          <Wrap spacing={4}>
            {[...Array(3)].map((_, i) => (
              <WrapItem key={i}>
                <Skeleton width="48px" height="48px" borderRadius="full" />
              </WrapItem>
            ))}
          </Wrap>
        ) : users.length > 0 ? (
          <Wrap spacing={4}>
            {users.map((user) => {
              const active = isUserActive(user.last_seen)
              const story = getUserStory(user.id)
              const isCurrentUser = currentUser?.id === user.id
              
              return (
                <WrapItem key={user.id}>
                  <VStack spacing={2} position="relative">
                    {story && (
                      <Box
                        position="absolute"
                        top="-45px"
                        left="50%"
                        transform="translateX(-50%)"
                        onClick={() => {
                          setSelectedStory(story)
                          setEditContent(story.content)
                        }}
                      >
                        <NoteBubble content={story.content} />
                      </Box>
                    )}
                    <Box position="relative">
                      <Circle
                        size="60px"
                        bg={active ? "green.400" : "transparent"}
                        opacity={active ? 0.2 : 0}
                        position="absolute"
                        top="-2px"
                        left="-2px"
                        right="-2px"
                        bottom="-2px"
                      />
                      <Tooltip label={`${user.name}${active ? ' (aktywny/a)' : ''}`}>
                        <Box position="relative">
                          <Avatar
                            name={user.name}
                            src={user.avatar_url}
                            size="lg"
                            cursor="pointer"
                            border={active ? "2px solid" : "none"}
                            borderColor="green.400"
                          />
                          {isCurrentUser && !story && (
                            <IconButton
                              aria-label="Dodaj notatkę"
                              icon={<AddIcon />}
                              onClick={onOpen}
                              size="sm"
                              colorScheme="blue"
                              position="absolute"
                              top="-2"
                              right="-2"
                              rounded="full"
                            />
                          )}
                        </Box>
                      </Tooltip>
                      {active && (
                        <Circle
                          size="3"
                          bg="green.400"
                          position="absolute"
                          bottom="0"
                          right="0"
                          border="2px solid"
                          borderColor={cardBg}
                        />
                      )}
                    </Box>
                    <Text 
                      fontSize="sm" 
                      color={active ? "green.400" : textColor} 
                      fontWeight={active ? "bold" : "normal"}
                    >
                      {user.name}
                    </Text>
                  </VStack>
                </WrapItem>
              )
            })}
          </Wrap>
        ) : (
          <Text color={textColor}>Nie znaleziono użytkowników 😢</Text>
        )}
      </Box>

      {/* Modal dodawania nowej notatki */}
      <AddStory 
        isOpen={isOpen} 
        onClose={onClose}
        onStoryAdded={fetchStories}
      />

      {/* Modal wyświetlania/edycji notatki */}
      <Modal 
        isOpen={!!selectedStory} 
        onClose={() => {
          setSelectedStory(null)
          setIsEditing(false)
          setEditContent('')
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg="gray.800" maxW="sm">
          <ModalBody p={6}>
            <VStack spacing={4} align="stretch">
              <Flex align="center" gap={3}>
                {selectedStory && (
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
              {isEditing ? (
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  color="white"
                  bg="gray.700"
                  border="none"
                  _focus={{
                    border: 'none',
                    ring: 2,
                    ringColor: 'blue.500'
                  }}
                />
              ) : (
                <Text color="gray.100" fontSize="lg">
                  {selectedStory?.content}
                </Text>
              )}
            </VStack>
          </ModalBody>
          {selectedStory && currentUser && selectedStory.user_id === currentUser.id && (
            <ModalFooter>
              {isEditing ? (
                <HStack spacing={2}>
                  <Button
                    colorScheme="blue"
                    onClick={handleEdit}
                  >
                    Zapisz
                  </Button>
                  <Button
                    variant="ghost"
                    color="white"
                    onClick={() => {
                      setIsEditing(false)
                      setEditContent(selectedStory.content)
                    }}
                  >
                    Anuluj
                  </Button>
                </HStack>
              ) : (
                <HStack spacing={2}>
                  <Button
                    leftIcon={<EditIcon />}
                    colorScheme="blue"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(true)
                      setEditContent(selectedStory.content)
                    }}
                  >
                    Edytuj
                  </Button>
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
                </HStack>
              )}
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>

      <Box>
        <Heading size="lg" mb={4} color={headingColor}>Funkcje</Heading>
        <Wrap spacing={{ base: 4, md: 8 }} justify="center">
          <WrapItem width={{ base: "calc(50% - 8px)", md: "auto" }}>
            <Box 
              p={{ base: 4, md: 6 }}
              bg={cardBg} 
              borderRadius="lg" 
              shadow="md" 
              width={{ base: "100%", md: "250px" }}
              height={{ base: "180px", md: "200px" }}
              borderWidth="1px"
              borderColor={cardBorder}
              cursor="pointer"
              _hover={{ 
                transform: "translateY(-5px)", 
                shadow: "lg",
                borderColor: "blue.400"
              }}
              transition="all 0.3s"
              onClick={() => navigate('/events')}
            >
              <Flex direction="column" align="center" justify="center" height="100%">
                <Icon as={ViewIcon} boxSize={{ base: 8, md: 10 }} color="blue.500" mb={3} />
                <Heading size="md" mb={{ base: 2, md: 3 }} textAlign="center" color={headingColor}>
                  Wydarzenia
                </Heading>
                <Text textAlign="center" color={textColor} fontSize={{ base: "sm", md: "md" }}>
                  Przeglądaj i dołączaj do nadchodzących spotkań
                </Text>
              </Flex>
            </Box>
          </WrapItem>
          
          <WrapItem width={{ base: "calc(50% - 8px)", md: "auto" }}>
            <Box 
              p={{ base: 4, md: 6 }}
              bg={cardBg} 
              borderRadius="lg" 
              shadow="md" 
              width={{ base: "100%", md: "250px" }}
              height={{ base: "180px", md: "200px" }}
              borderWidth="1px"
              borderColor={cardBorder}
              cursor="pointer"
              _hover={{ 
                transform: "translateY(-5px)", 
                shadow: "lg",
                borderColor: "green.400"
              }}
              transition="all 0.3s"
              onClick={() => navigate('/calendar')}
            >
              <Flex direction="column" align="center" justify="center" height="100%">
                <Icon as={CalendarIcon} boxSize={{ base: 8, md: 10 }} color="green.500" mb={3} />
                <Heading size="md" mb={{ base: 2, md: 3 }} textAlign="center" color={headingColor}>
                  Kalendarz
                </Heading>
                <Text textAlign="center" color={textColor} fontSize={{ base: "sm", md: "md" }}>
                  Zaplanuj swój czas i sprawdź nadchodzące wydarzenia
                </Text>
              </Flex>
            </Box>
          </WrapItem>
          
          <WrapItem width={{ base: "calc(50% - 8px)", md: "auto" }}>
            <Box 
              p={{ base: 4, md: 6 }}
              bg={cardBg} 
              borderRadius="lg" 
              shadow="md" 
              width={{ base: "100%", md: "250px" }}
              height={{ base: "180px", md: "200px" }}
              borderWidth="1px"
              borderColor={cardBorder}
              cursor="pointer"
              _hover={{ 
                transform: "translateY(-5px)", 
                shadow: "lg",
                borderColor: "purple.400"
              }}
              transition="all 0.3s"
              onClick={() => navigate('/surveys')}
            >
              <Flex direction="column" align="center" justify="center" height="100%">
                <Icon as={StarIcon} boxSize={{ base: 8, md: 10 }} color="purple.500" mb={3} />
                <Heading size="md" mb={{ base: 2, md: 3 }} textAlign="center" color={headingColor}>
                  Ankiety
                </Heading>
                <Text textAlign="center" color={textColor} fontSize={{ base: "sm", md: "md" }}>
                  Głosuj i decyduj o szczegółach nadchodzących wydarzeń
                </Text>
              </Flex>
            </Box>
          </WrapItem>
          
          <WrapItem width={{ base: "calc(50% - 8px)", md: "auto" }}>
            <Box 
              p={{ base: 4, md: 6 }}
              bg={cardBg} 
              borderRadius="lg" 
              shadow="md" 
              width={{ base: "100%", md: "250px" }}
              height={{ base: "180px", md: "200px" }}
              borderWidth="1px"
              borderColor={cardBorder}
              cursor="pointer"
              _hover={{ 
                transform: "translateY(-5px)", 
                shadow: "lg",
                borderColor: "orange.400"
              }}
              transition="all 0.3s"
              onClick={() => navigate('/profile')}
            >
              <Flex direction="column" align="center" justify="center" height="100%">
                <Icon as={FaUser} boxSize={{ base: 8, md: 9 }} color="orange.500" mb={3} />
                <Heading size="md" mb={{ base: 2, md: 3 }} textAlign="center" color={headingColor}>
                  Profil
                </Heading>
                <Text textAlign="center" color={textColor} fontSize={{ base: "sm", md: "md" }}>
                  Edytuj swoje dane i zarządzaj ustawieniami
                </Text>
              </Flex>
            </Box>
          </WrapItem>
        </Wrap>
      </Box>
    </VStack>
  )
}

export default Home