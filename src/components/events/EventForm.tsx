import React, { useEffect } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
  FormErrorMessage,
  Select,
  Switch,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useColorModeValue,
  HStack,
  InputGroup,
  InputRightElement,
  Spinner,
} from '@chakra-ui/react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { searchPlaces } from '../../lib/googleMaps'
import { Search2Icon } from '@chakra-ui/icons'
import debounce from 'lodash.debounce'

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  end_time?: string | null;
  has_end_time?: boolean;
  location: string;
  created_by: string;
  is_recurring?: boolean;
  weekday?: number | null;
}

interface EventFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onEventCreated?: () => void;
  event?: Event;  // Dla trybu edycji
  onSuccess?: () => void;  // Callback po pomyślnym zapisaniu
  onCancel?: () => void;   // Callback przy anulowaniu
}

const EventForm = ({ isOpen, onClose, onEventCreated, event, onSuccess, onCancel }: EventFormProps) => {
  const { user } = useAuth()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isRecurring, setIsRecurring] = React.useState(false)
  const [hasEndTime, setHasEndTime] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [locationType, setLocationType] = React.useState<'text' | 'map'>('text')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  const infoBgColor = useColorModeValue('blue.50', 'gray.700')
  const infoTextColor = useColorModeValue('gray.600', 'gray.300')
  const resultsBgColor = useColorModeValue('white', 'gray.700')
  const resultsHoverBgColor = useColorModeValue('gray.100', 'gray.600')
  
  const isEditMode = !!event

  // Funkcja do wyszukiwania miejsc
  const handleSearchPlaces = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchPlaces(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching places:', error)
      toast({
        title: 'Błąd Google Maps API',
        description: error instanceof Error ? error.message : 'Wystąpił nieznany błąd podczas wyszukiwania miejsc',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      // W przypadku błędu API, przełączamy z powrotem na tryb tekstowy
      setLocationType('text')
    } finally {
      setIsSearching(false)
    }
  }

  // Funkcja do obsługi debounce
  const debouncedSearch = React.useCallback(
    debounce((query: string) => handleSearchPlaces(query), 300),
    []
  )

  useEffect(() => {
    if (event) {
      setTitle(event.title || '')
      setDescription(event.description || '')
      setDate(event.date || '')
      setTime(event.time || '')
      setEndTime(event.end_time || '')
      setLocation(event.location || '')
      setIsRecurring(event.is_recurring || false)
      setHasEndTime(event.has_end_time || false)
    }
  }, [event])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: 'Błąd',
        description: 'Musisz być zalogowany',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!title || !date || !time || !location) {
      toast({
        title: 'Błąd',
        description: 'Wypełnij wszystkie wymagane pola',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Oblicz dzień tygodnia (0 = niedziela, 1 = poniedziałek, ..., 6 = sobota)
      const selectedDate = new Date(date)
      const weekday = selectedDate.getDay()
      console.log('Selected date:', date, 'weekday:', weekday) // Debugging

      const eventData = {
        title,
        description,
        date,
        time,
        location,
        is_recurring: isRecurring,
        weekday: isRecurring ? weekday : null,
        has_end_time: hasEndTime,
        end_time: hasEndTime ? endTime : null,
      }

      if (isEditMode && event) {
        // Tryb edycji
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)

        if (error) throw error

        toast({
          title: 'Sukces',
          description: 'Wydarzenie zostało zaktualizowane',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })

        if (onSuccess) onSuccess()
      } else {
        // Tryb tworzenia
        const { error } = await supabase
          .from('events')
          .insert([{
            ...eventData,
            created_by: user.id,
          }])

        if (error) throw error

        toast({
          title: 'Sukces',
          description: 'Wydarzenie zostało utworzone',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })

        if (onEventCreated) onEventCreated()
        if (onClose) onClose()
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania wydarzenia:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać wydarzenia',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Renderuj formularz w modalu tylko jeśli isOpen jest przekazane
  const renderForm = () => (
    <form onSubmit={handleSubmit}>
      <VStack spacing={4}>
        <FormControl isRequired>
          <FormLabel>Tytuł</FormLabel>
          <Input 
            name="title" 
            placeholder="Nazwa wydarzenia" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Opis</FormLabel>
          <Textarea 
            name="description" 
            placeholder="Opis wydarzenia" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Data</FormLabel>
          <Input 
            name="date" 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Godzina rozpoczęcia</FormLabel>
          <Input 
            name="time" 
            type="time" 
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Powtarzaj co tydzień</FormLabel>
          <Switch
            isChecked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
        </FormControl>

        {isRecurring && (
          <Box w="100%" p={3} bg={infoBgColor} borderRadius="md">
            <Text fontSize="sm" color={infoTextColor}>
              Wydarzenie będzie się powtarzać w ten sam dzień tygodnia co wybrana data.
            </Text>
          </Box>
        )}

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Określ czas zakończenia</FormLabel>
          <Switch
            isChecked={hasEndTime}
            onChange={(e) => setHasEndTime(e.target.checked)}
          />
        </FormControl>

        {hasEndTime && (
          <FormControl>
            <FormLabel>Godzina zakończenia</FormLabel>
            <Input 
              name="end_time" 
              type="time" 
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </FormControl>
        )}

        <FormControl isRequired>
          <FormLabel>Lokalizacja</FormLabel>
          <VStack align="stretch" spacing={2}>
            <HStack>
              <Button
                flex={1}
                variant={locationType === 'text' ? 'solid' : 'outline'}
                onClick={() => {
                  setLocationType('text')
                  setSearchResults([])
                  setSearchQuery('')
                }}
              >
                Własny tekst
              </Button>
              <Button
                flex={1}
                variant={locationType === 'map' ? 'solid' : 'outline'}
                onClick={() => setLocationType('map')}
              >
                Wyszukaj adres
              </Button>
            </HStack>

            {locationType === 'text' ? (
              <Input
                placeholder="np. U Marcina w domu, Park Śląski, itp."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            ) : (
              <VStack align="stretch" spacing={2}>
                <InputGroup>
                  <Input
                    placeholder="Wyszukaj miejsce..."
                    value={location || searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setLocation('')  // Czyścimy lokalizację przy nowym wyszukiwaniu
                      debouncedSearch(e.target.value)
                    }}
                  />
                  <InputRightElement>
                    {isSearching ? (
                      <Spinner size="sm" />
                    ) : (
                      <Search2Icon color="gray.500" />
                    )}
                  </InputRightElement>
                </InputGroup>

                {searchResults.length > 0 && !location && (
                  <Box
                    borderWidth={1}
                    borderRadius="md"
                    maxH="200px"
                    overflowY="auto"
                    position="relative"
                    zIndex={1000}
                    bg={resultsBgColor}
                    boxShadow="md"
                  >
                    {searchResults.map((result) => (
                      <Box
                        key={result.place_id}
                        p={2}
                        cursor="pointer"
                        _hover={{ bg: resultsHoverBgColor }}
                        onClick={() => {
                          setLocation(result.formatted_address)
                          setSearchQuery(result.formatted_address)
                          setSearchResults([])
                        }}
                      >
                        <Text fontWeight="bold">{result.name}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {result.formatted_address}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                )}

                {location && (
                  <Box p={2} borderWidth={1} borderRadius="md" bg={infoBgColor}>
                    <Text fontSize="sm" color={infoTextColor}>
                      Wybrana lokalizacja: {location}
                    </Text>
                  </Box>
                )}
              </VStack>
            )}
          </VStack>
        </FormControl>

        <HStack width="100%" justify={isEditMode ? "flex-end" : "center"} mt={4} spacing={4}>
          {isEditMode && (
            <Button onClick={onCancel}>
              Anuluj
            </Button>
          )}
          <Button
            type="submit"
            colorScheme="blue"
            width={isEditMode ? "auto" : "100%"}
            isLoading={isSubmitting}
          >
            {isEditMode ? 'Zapisz zmiany' : 'Utwórz wydarzenie'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )

  // Jeżeli komponent jest używany w modalu, renderuj modal, w przeciwnym razie tylko formularz
  if (isOpen !== undefined && onClose) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditMode ? 'Edytuj wydarzenie' : 'Dodaj nowe wydarzenie'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {renderForm()}
          </ModalBody>
        </ModalContent>
      </Modal>
    )
  }
  
  // W trybie edycji, zwróć tylko formularz (bez modalu)
  return renderForm()
}

export default EventForm 