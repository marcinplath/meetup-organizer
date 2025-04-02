import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Divider,
  Skeleton,
  useToast,
  Avatar,
  AvatarGroup,
  Tooltip,
  Wrap,
  WrapItem,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Textarea,
  IconButton,
  Flex,
  useBreakpointValue,
  Stack,
} from '@chakra-ui/react'
import { CalendarIcon, TimeIcon, InfoIcon, ArrowBackIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import EventForm from '../components/events/EventForm'

interface Participant {
  id: string
  user: {
    id: string
    name: string
    avatar_url: string | null
  }
  status: 'pending' | 'accepted' | 'declined'
}

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  end_date?: string
  end_time?: string
  has_end_time?: boolean
  location: string
  type: 'one-time' | 'recurring'
  created_by: string
  created_at: string
  creator: {
    name: string | null
    avatar_url: string | null
  } | null
  participants: Participant[]
}

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    name: string
    avatar_url: string | null
  }
}

const EventDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const commentButtonRef = React.useRef<HTMLButtonElement>(null)
  const commentSectionRef = React.useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)

  // Dodajemy pomocnicze zmienne dla responsywności
  const isMobile = useBreakpointValue({ base: true, md: false })
  const buttonSize = useBreakpointValue({ base: 'sm', md: 'md' })
  const headingSize = useBreakpointValue({ base: 'md', md: 'lg' })
  const fontSize = useBreakpointValue({ base: 'sm', md: 'md' })
  const spacing = useBreakpointValue({ base: 2, md: 4 })
  const avatarSize = useBreakpointValue({ base: 'sm', md: 'md' })

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:users (
            id,
            name,
            avatar_url
          ),
          participants:event_participants (
            id,
            user:users (
              id,
              name,
              avatar_url
            ),
            status
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error details:', error)
        throw error
      }

      setEvent(data)
    } catch (error) {
      console.error('Błąd podczas pobierania szczegółów wydarzenia:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać szczegółów wydarzenia',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchComments = async () => {
    if (!id) return

    try {
      // Pobierz komentarze
      const { data: commentsData, error: commentsError } = await supabase
        .from('event_comments')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false })

      if (commentsError) throw commentsError

      // Pobierz dane użytkowników
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))]
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', userIds)

      if (usersError) throw usersError

      // Utwórz mapę użytkowników
      const usersMap = new Map(
        usersData.map(user => [
          user.id,
          {
            id: user.id,
            name: user.name || 'Nieznany użytkownik',
            avatar_url: user.avatar_url
          }
        ])
      )

      // Połącz dane
      const formattedComments = commentsData.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user: usersMap.get(comment.user_id) || {
          id: comment.user_id,
          name: 'Nieznany użytkownik',
          avatar_url: null
        }
      }))

      setComments(formattedComments)
    } catch (error) {
      console.error('Błąd podczas pobierania komentarzy:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać komentarzy',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchEventDetails(),
        fetchComments()
      ]).catch(error => {
        console.error('Błąd podczas pobierania danych:', error)
      })
    }
  }, [id])

  const handleJoinEvent = async () => {
    if (!user || !event) return

    setIsJoining(true)
    try {
      const { error } = await supabase
        .from('event_participants')
        .insert([
          {
            event_id: event.id,
            user_id: user.id,
            status: 'pending'
          }
        ])

      if (error) throw error

      toast({
        title: 'Sukces!',
        description: 'Zgłoszenie zostało wysłane',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      fetchEventDetails()
    } catch (error) {
      console.error('Błąd podczas dołączania do wydarzenia:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się dołączyć do wydarzenia',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleUpdateStatus = async (newStatus: 'accepted' | 'declined') => {
    if (!user || !event) return

    setIsJoining(true)
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({ status: newStatus })
        .eq('event_id', event.id)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: 'Sukces!',
        description: newStatus === 'accepted' ? 'Potwierdzono udział w wydarzeniu' : 'Odrzucono udział w wydarzeniu',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      fetchEventDetails()
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować statusu',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveEvent = async () => {
    if (!user || !event) return

    setIsLeaving(true)
    try {
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: 'Sukces!',
        description: 'Opuściłeś wydarzenie',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      fetchEventDetails()
    } catch (error) {
      console.error('Błąd podczas opuszczania wydarzenia:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się opuścić wydarzenia',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLeaving(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!event || !user) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('created_by', user.id)

      if (error) throw error

      toast({
        title: 'Sukces!',
        description: 'Wydarzenie zostało usunięte',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      navigate('/events')
    } catch (error) {
      console.error('Błąd podczas usuwania wydarzenia:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć wydarzenia',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleEventUpdated = () => {
    onEditClose()
    fetchEventDetails()
  }

  // Dodajmy pomocniczą funkcję do określenia statusu uczestnika
  const participantStatus = useMemo(() => {
    if (!user || !event?.participants) return null;
    const participant = event.participants.find(p => p.user.id === user.id);
    return participant?.status || null;
  }, [user, event]);

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'green'
      case 'declined':
        return 'red'
      case 'pending':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  const getParticipantStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Potwierdzony'
      case 'declined':
        return 'Odrzucony'
      case 'pending':
        return 'Oczekujący'
      default:
        return 'Nieznany'
    }
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: pl })
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5)
  }

  const getEventTypeColor = (type: 'one-time' | 'recurring') => {
    return type === 'one-time' ? 'blue' : 'purple'
  }

  const getEventTypeLabel = (type: 'one-time' | 'recurring') => {
    return type === 'one-time' ? 'Jednorazowe' : 'Cykliczne'
  }

  const handleAddComment = async () => {
    if (!user || !id || !newComment.trim()) return

    // Zapisujemy aktualną pozycję przewijania 
    setScrollPosition(window.scrollY)
    
    setIsSubmittingComment(true)
    try {
      const { error } = await supabase
        .from('event_comments')
        .insert([
          {
            event_id: id,
            user_id: user.id,
            content: newComment.trim()
          }
        ])

      if (error) throw error

      setNewComment('')
      await fetchComments()
      
      // Bardziej agresywne podejście do usuwania focusu
      setTimeout(() => {
        // Usuwamy fokus z aktywnego elementu (pole tekstowe)
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        
        // Przywracamy poprzednią pozycję przewijania
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        })
        
        // Opcjonalnie przewiń do sekcji komentarzy
        if (commentSectionRef.current) {
          commentSectionRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          })
        }
      }, 300)
      
      toast({
        title: 'Sukces',
        description: 'Komentarz został dodany',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Błąd podczas dodawania komentarza:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać komentarza',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !event) return

    try {
      let query = supabase
        .from('event_comments')
        .delete()
        .eq('id', commentId)
        .eq('event_id', event.id)

      // Jeśli użytkownik nie jest twórcą wydarzenia, może usunąć tylko własne komentarze
      if (user.id !== event.created_by) {
        query = query.eq('user_id', user.id)
      }

      const { error } = await query

      if (error) throw error

      fetchComments()
      
      toast({
        title: 'Sukces',
        description: 'Komentarz został usunięty',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Błąd podczas usuwania komentarza:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć komentarza',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const formatCommentDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy, HH:mm', { locale: pl })
  }

  if (isLoading) {
    return (
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        <Skeleton height="40px" />
        <Skeleton height="20px" />
        <Skeleton height="200px" />
      </VStack>
    )
  }

  if (!event) {
    return (
      <VStack spacing={{ base: 4, md: 6 }} align="center">
        <Heading size="md">Nie znaleziono wydarzenia</Heading>
        <Button
          leftIcon={<ArrowBackIcon />}
          onClick={() => navigate('/events')}
        >
          Wróć do listy wydarzeń
        </Button>
      </VStack>
    )
  }

  return (
    <VStack spacing={{ base: 4, md: 6 }} align="stretch">
      {/* Nagłówek i przyciski nawigacyjne */}
      <Stack 
        direction={{ base: 'column', sm: 'row' }} 
        justify="space-between" 
        align={{ base: 'stretch', sm: 'center' }}
        spacing={3}
      >
        <Button
          leftIcon={<ArrowBackIcon />}
          variant="ghost"
          onClick={() => navigate('/events')}
          size={buttonSize}
          width={{ base: '100%', sm: 'auto' }}
        >
          Wróć do listy wydarzeń
        </Button>
        
        {user && event && user.id === event.created_by && (
          <Stack 
            direction={{ base: 'row', sm: 'row' }} 
            spacing={2} 
            width={{ base: '100%', sm: 'auto' }}
            justify={{ base: 'space-between', sm: 'flex-end' }}
          >
            <Button
              leftIcon={<EditIcon />}
              colorScheme="blue"
              variant="ghost"
              onClick={onEditOpen}
              size={buttonSize}
              flex={{ base: 1, sm: 'auto' }}
            >
              Edytuj
            </Button>
            <Button
              leftIcon={<DeleteIcon />}
              colorScheme="red"
              variant="ghost"
              onClick={onDeleteOpen}
              size={buttonSize}
              flex={{ base: 1, sm: 'auto' }}
            >
              Usuń wydarzenie
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Informacje o wydarzeniu */}
      <VStack align="start" spacing={3}>
        <Badge colorScheme={getEventTypeColor(event.type)} fontSize={fontSize}>
          {getEventTypeLabel(event.type)}
        </Badge>
        <Heading size={headingSize}>{event.title}</Heading>

        <HStack spacing={3}>
          <Avatar
            size="sm"
            name={event.creator?.name || 'Nieznany użytkownik'}
            src={event.creator?.avatar_url || undefined}
          />
          <Text fontSize={fontSize} color="gray.600">
            Utworzone przez {event.creator?.name || 'Nieznany użytkownik'}
          </Text>
        </HStack>
      </VStack>

      <Divider />

      {/* Data, czas i miejsce */}
      <VStack align="start" spacing={3}>
        <Flex align="center" wrap="wrap">
          <Box mr={2} display="inline-flex" alignItems="center">
            <CalendarIcon mr={2} />
            <Text fontSize={fontSize}>{formatDate(event.date)}</Text>
          </Box>
        </Flex>
        
        <VStack align="start" spacing={1} width="100%">
          <Flex align="center">
            <TimeIcon mr={2} />
            <Text fontSize={fontSize}>Start: {formatTime(event.time)}</Text>
          </Flex>
          
          {(event.has_end_time || event.type === 'recurring') && event.end_time && (
            <Flex pl={{ base: 0, md: 6 }} ml={{ base: 6, md: 0 }} align="center">
              <Text fontSize={fontSize} color="gray.600">
                Koniec: {event.end_date && event.end_date !== event.date 
                  ? `${formatDate(event.end_date)}, ${formatTime(event.end_time)}`
                  : formatTime(event.end_time)
              }
              </Text>
            </Flex>
          )}
        </VStack>
        
        <Flex align="center">
          <InfoIcon mr={2} />
          <Text fontSize={fontSize}>{event.location}</Text>
        </Flex>
      </VStack>

      {/* Opis wydarzenia */}
      <Box>
        <Text fontWeight="bold" mb={2} fontSize={fontSize}>Opis wydarzenia:</Text>
        <Text whiteSpace="pre-wrap" fontSize={fontSize}>{event.description}</Text>
      </Box>

      {/* Uczestnicy */}
      <VStack align="start" spacing={3}>
        <Flex 
          justifyContent="space-between" 
          width="100%" 
          direction={{ base: 'column', sm: 'row' }}
          gap={2}
        >
          <Text fontWeight="bold" fontSize={fontSize}>
            Uczestnicy ({event.participants?.filter(p => p.status === 'accepted').length || 0}):
          </Text>
          <Badge colorScheme="blue" alignSelf={{ base: 'flex-start', sm: 'center' }}>
            Oczekujący: {event.participants?.filter(p => p.status === 'pending').length || 0}
          </Badge>
        </Flex>
        
        <Wrap spacing={{ base: 2, md: 4 }}>
          {event.participants?.filter(p => p.status === 'accepted').map((participant) => (
            <WrapItem key={participant.id}>
              <Tooltip label={`${participant.user.name} (${getParticipantStatusLabel(participant.status)})`}>
                <Avatar
                  size={avatarSize}
                  name={participant.user.name}
                  src={participant.user.avatar_url || undefined}
                />
              </Tooltip>
            </WrapItem>
          ))}
        </Wrap>
      </VStack>

      {/* Przyciski uczestnictwa */}
      {user && user.id !== event.created_by && (
        <VStack spacing={2} width="100%">
          {participantStatus === 'pending' ? (
            <>
              <Text fontSize={fontSize}>Twoje zgłoszenie oczekuje na potwierdzenie</Text>
              <Stack 
                direction={{ base: 'column', sm: 'row' }} 
                spacing={2} 
                width="100%"
              >
                <Button
                  colorScheme="green"
                  isLoading={isJoining}
                  onClick={() => handleUpdateStatus('accepted')}
                  size={buttonSize}
                  width="100%"
                >
                  Potwierdź udział
                </Button>
                <Button
                  colorScheme="red"
                  isLoading={isJoining}
                  onClick={() => handleUpdateStatus('declined')}
                  size={buttonSize}
                  width="100%"
                >
                  Odrzuć udział
                </Button>
              </Stack>
            </>
          ) : participantStatus === 'accepted' ? (
            <Button
              colorScheme="red"
              isLoading={isLeaving}
              onClick={handleLeaveEvent}
              size={buttonSize}
              width={{ base: '100%', md: 'auto' }}
            >
              Zrezygnuj z udziału
            </Button>
          ) : participantStatus === 'declined' ? (
            <Button
              colorScheme="blue"
              isLoading={isJoining}
              onClick={handleJoinEvent}
              size={buttonSize}
              width={{ base: '100%', md: 'auto' }}
            >
              Zgłoś się ponownie
            </Button>
          ) : (
            <Button
              colorScheme="blue"
              isLoading={isJoining}
              onClick={handleJoinEvent}
              size={buttonSize}
              width={{ base: '100%', md: 'auto' }}
            >
              Dołącz do wydarzenia
            </Button>
          )}
        </VStack>
      )}

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Usuń wydarzenie
            </AlertDialogHeader>

            <AlertDialogBody>
              Czy na pewno chcesz usunąć to wydarzenie? Tej operacji nie można cofnąć.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Anuluj
              </Button>
              <Button colorScheme="red" onClick={handleDeleteEvent} ml={3}>
                Usuń
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edytuj wydarzenie</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <EventForm
              event={event}
              onSuccess={handleEventUpdated}
              onCancel={onEditClose}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Divider my={{ base: 4, md: 6 }} />

      {/* Sekcja komentarzy */}
      <VStack align="stretch" spacing={{ base: 4, md: 6 }} ref={commentSectionRef}>
        <Heading size={headingSize}>Komentarze</Heading>
        
        {user && (
          <Box>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Dodaj komentarz..."
              resize="vertical"
              rows={3}
              fontSize={fontSize}
              inputMode="text"
              onFocus={() => setScrollPosition(window.scrollY)}
            />
            <Button
              mt={2}
              ref={commentButtonRef}
              colorScheme="blue"
              isLoading={isSubmittingComment}
              onClick={handleAddComment}
              isDisabled={!newComment.trim()}
              size={buttonSize}
              width={{ base: '100%', md: 'auto' }}
            >
              Dodaj komentarz
            </Button>
          </Box>
        )}

        <VStack align="stretch" spacing={3}>
          {comments.map((comment) => (
            <Box
              key={comment.id}
              p={{ base: 3, md: 4 }}
              borderWidth={1}
              borderRadius="md"
              position="relative"
            >
              <HStack spacing={3} mb={2}>
                <Avatar
                  size="sm"
                  name={comment.user.name}
                  src={comment.user.avatar_url || undefined}
                />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize={fontSize}>{comment.user.name}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatCommentDate(comment.created_at)}
                  </Text>
                </VStack>
                {user && (user.id === comment.user.id || user.id === event.created_by) && (
                  <IconButton
                    aria-label="Usuń komentarz"
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    position="absolute"
                    right={2}
                    top={2}
                    onClick={() => handleDeleteComment(comment.id)}
                  />
                )}
              </HStack>
              <Text whiteSpace="pre-wrap" fontSize={fontSize}>{comment.content}</Text>
            </Box>
          ))}
          {comments.length === 0 && (
            <Text color="gray.500" textAlign="center" fontSize={fontSize}>
              Brak komentarzy. Bądź pierwszy!
            </Text>
          )}
        </VStack>
      </VStack>
    </VStack>
  )
}

export default EventDetails 