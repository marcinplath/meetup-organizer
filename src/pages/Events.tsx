import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  SimpleGrid,
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  useToast,
  Avatar,
  AvatarGroup,
  Tooltip,
} from '@chakra-ui/react'
import { AddIcon, CalendarIcon, TimeIcon, InfoIcon } from '@chakra-ui/icons'
import { supabase } from '../lib/supabase'
import EventForm from '../components/events/EventForm'
import { format, isBefore, startOfToday, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  is_recurring: boolean
  weekday: number | null
  created_by: string
  has_end_time?: boolean
  end_date?: string
  end_time?: string
  creator?: {
    name: string
    avatar_url?: string | null
  }
  participants?: {
    id: string
    user: {
      name: string
      avatar_url?: string | null
    }
    status: string
  }[]
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const navigate = useNavigate()

  const isEventPassed = (event: Event) => {
    const now = new Date()
    const eventDate = parseISO(event.date)
    const eventTime = event.time
    
    // Utwórz pełną datę wydarzenia z godziną
    const eventDateTime = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      parseInt(eventTime.split(':')[0]),
      parseInt(eventTime.split(':')[1])
    )
    
    // Jeśli wydarzenie ma datę i czas zakończenia, sprawdź czy już minęło
    if (event.end_date && event.end_time) {
      const endDate = parseISO(event.end_date)
      const endTime = event.end_time
      const endDateTime = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        parseInt(endTime.split(':')[0]),
        parseInt(endTime.split(':')[1])
      )
      return isBefore(endDateTime, now)
    }
    
    // Dla wydarzeń cyklicznych bez daty końcowej
    if (event.is_recurring && !event.end_date) {
      return false // nigdy nie są przeterminowane
    }
    
    // Dla wydarzeń jednorazowych lub gdy nie ma daty końcowej
    return isBefore(eventDateTime, now)
  }

  const sortEvents = (events: Event[]) => {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    })
  }

  const getCurrentEvents = (events: Event[]) => {
    return sortEvents(events.filter(event => !isEventPassed(event)))
  }

  const getPastEvents = (events: Event[]) => {
    return sortEvents(events.filter(isEventPassed))
  }

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:users (
            name,
            avatar_url
          ),
          participants:event_participants (
            id,
            user:users (
              name,
              avatar_url
            ),
            status
          )
        `)
        .order('date', { ascending: true })

      if (error) {
        throw error
      }

      setEvents(data || [])
    } catch (error) {
      console.error('Błąd podczas pobierania wydarzeń:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać listy wydarzeń',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleEventCreated = () => {
    onClose()
    fetchEvents()
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: pl })
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Format HH:mm
  }

  const getEventTypeColor = (type: 'one-time' | 'recurring') => {
    return type === 'one-time' ? 'blue' : 'purple'
  }

  const getEventTypeLabel = (type: 'one-time' | 'recurring') => {
    return type === 'one-time' ? 'Jednorazowe' : 'Cykliczne'
  }

  const handleViewDetails = (eventId: string) => {
    navigate(`/events/${eventId}`)
  }

  const getDayName = (weekday: number) => {
    const days = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']
    return days[weekday]
  }

  return (
    <>
      <HStack justify="space-between" mb={8}>
        <Heading size="lg">Wydarzenia</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={onOpen}
        >
          Dodaj wydarzenie
        </Button>
      </HStack>

      {isLoading ? (
        <Text>Ładowanie wydarzeń...</Text>
      ) : events.length === 0 ? (
        <Box 
          p={6} 
          textAlign="center" 
          borderRadius="lg" 
          borderWidth="1px" 
          borderStyle="dashed"
        >
          <Text>Brak wydarzeń do wyświetlenia. Utwórz pierwsze wydarzenie!</Text>
        </Box>
      ) : (
        <VStack spacing={8} align="stretch">
          {getCurrentEvents(events).length > 0 && (
            <Box>
              <Heading size="md" mb={4}>Aktualne wydarzenia</Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {getCurrentEvents(events).map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <VStack align="start" spacing={2}>
                        <Badge colorScheme={event.is_recurring ? 'purple' : 'blue'}>
                          {event.is_recurring ? 'Cykliczne' : 'Jednorazowe'}
                        </Badge>
                        <Heading size="md">{event.title}</Heading>
                      </VStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={3}>
                        <HStack>
                          <CalendarIcon />
                          <Text>{formatDate(event.date)}</Text>
                        </HStack>
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <TimeIcon />
                            <Text>Start: {formatTime(event.time)}</Text>
                          </HStack>
                          {event.has_end_time && event.end_time && (
                            <HStack pl={6}>
                              <Text fontSize="sm" color="gray.500">
                                Koniec: {event.end_date && event.end_date !== event.date 
                                  ? `${formatDate(event.end_date)}, ${formatTime(event.end_time)}`
                                  : formatTime(event.end_time)
                                }
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                        {event.is_recurring && event.weekday !== null && (
                          <HStack>
                            <Text fontSize="sm" color="gray.500">
                              Powtarza się w każdy {getDayName(event.weekday)}
                            </Text>
                          </HStack>
                        )}
                        <HStack>
                          <InfoIcon />
                          <Text noOfLines={1}>
                            {event.location}
                          </Text>
                        </HStack>
                        <Text noOfLines={2} color="gray.500">
                          {event.description}
                        </Text>
                        <HStack>
                          <Avatar
                            size="sm"
                            name={event.creator?.name || 'Nieznany użytkownik'}
                            src={event.creator?.avatar_url || undefined}
                          />
                          <Text fontSize="sm" color="gray.500">
                            {event.creator?.name || 'Nieznany użytkownik'}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        colorScheme="blue" 
                        size="sm" 
                        width="full"
                        onClick={() => handleViewDetails(event.id)}
                      >
                        Zobacz szczegóły
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </SimpleGrid>
            </Box>
          )}

          {getPastEvents(events).length > 0 && (
            <Box>
              <Heading size="md" mb={4}>Przeterminowane wydarzenia</Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} opacity={0.7}>
                {getPastEvents(events).map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <VStack align="start" spacing={2}>
                        <Badge colorScheme={event.is_recurring ? 'purple' : 'blue'}>
                          {event.is_recurring ? 'Cykliczne' : 'Jednorazowe'}
                        </Badge>
                        <Heading size="md">{event.title}</Heading>
                      </VStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={3}>
                        <HStack>
                          <CalendarIcon />
                          <Text>{formatDate(event.date)}</Text>
                        </HStack>
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <TimeIcon />
                            <Text>Start: {formatTime(event.time)}</Text>
                          </HStack>
                          {event.has_end_time && event.end_time && (
                            <HStack pl={6}>
                              <Text fontSize="sm" color="gray.500">
                                Koniec: {event.end_date && event.end_date !== event.date 
                                  ? `${formatDate(event.end_date)}, ${formatTime(event.end_time)}`
                                  : formatTime(event.end_time)
                                }
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                        {event.is_recurring && event.weekday !== null && (
                          <HStack>
                            <Text fontSize="sm" color="gray.500">
                              Powtarza się w każdy {getDayName(event.weekday)}
                            </Text>
                          </HStack>
                        )}
                        <HStack>
                          <InfoIcon />
                          <Text noOfLines={1}>
                            {event.location}
                          </Text>
                        </HStack>
                        <Text noOfLines={2} color="gray.500">
                          {event.description}
                        </Text>
                        <HStack>
                          <Avatar
                            size="sm"
                            name={event.creator?.name || 'Nieznany użytkownik'}
                            src={event.creator?.avatar_url || undefined}
                          />
                          <Text fontSize="sm" color="gray.500">
                            {event.creator?.name || 'Nieznany użytkownik'}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        colorScheme="blue" 
                        size="sm" 
                        width="full"
                        onClick={() => handleViewDetails(event.id)}
                      >
                        Zobacz szczegóły
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </SimpleGrid>
            </Box>
          )}
        </VStack>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Dodaj nowe wydarzenie</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <EventForm 
              onEventCreated={handleEventCreated}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default Events 