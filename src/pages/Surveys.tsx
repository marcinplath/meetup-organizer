import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Container,
  VStack,
  Text,
  useDisclosure,
  Card,
  CardHeader,
  CardBody,
  Heading,
  IconButton,
  HStack,
  useToast,
  Badge,
  Tooltip,
  Avatar,
  Flex,
  Spacer,
  Stack,
  useBreakpointValue,
  useColorModeValue
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import SurveyForm from '../components/surveys/SurveyForm'
import SurveyVote from '../components/surveys/SurveyVote'

interface Survey {
  id: string
  question: string
  is_multiple: boolean
  is_active: boolean
  created_by: string
  options: string[]
  creator?: {
    name: string
    avatar_url?: string
  }
}

const Surveys: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { user } = useAuth()
  const toast = useToast()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | undefined>()
  const [selectedSurveyForVoting, setSelectedSurveyForVoting] = useState<string | null>(null)
  
  // Kolory i ustawienia responsywności
  const isSmallScreen = useBreakpointValue({ base: true, md: false })
  const badgeBg = useColorModeValue('blue.100', 'blue.700')
  const activeBadgeBg = useColorModeValue('green.100', 'green.700')
  const inactiveBadgeBg = useColorModeValue('red.100', 'red.700')
  const cardBg = useColorModeValue('white', 'gray.700')

  useEffect(() => {
    fetchSurveys()
    
    // Nasłuchuj zmian w ankietach
    const surveysSubscription = supabase
      .channel('surveys_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'surveys'
      }, (payload) => {
        console.log('Zmiana w ankietach:', payload)
        // Odśwież całą listę przy każdej zmianie
        fetchSurveys()
      })
      .subscribe()

    return () => {
      surveysSubscription.unsubscribe()
    }
  }, [])

  const fetchSurveys = async () => {
    try {
      // Pobierz ankiety
      const { data: surveysData, error: surveysError } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })

      if (surveysError) throw surveysError
      if (!surveysData) return

      // Pobierz unikalne ID twórców
      const creatorIds = [...new Set(surveysData.map(survey => survey.created_by))]

      // Pobierz dane twórców
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', creatorIds)

      if (usersError) throw usersError

      // Połącz dane ankiet z danymi twórców
      const surveysWithCreators = surveysData.map(survey => ({
        ...survey,
        creator: usersData?.find(user => user.id === survey.created_by) || {
          name: 'Nieznany użytkownik',
          avatar_url: null
        }
      }))

      setSurveys(surveysWithCreators)
    } catch (error) {
      console.error('Błąd podczas pobierania ankiet:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać listy ankiet',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleCreateSurvey = () => {
    setSelectedSurvey(undefined)
    onOpen()
  }

  const handleEditSurvey = async (survey: Survey) => {
    try {
      // Pobierz opcje dla ankiety
      const { data: optionsData, error: optionsError } = await supabase
        .from('survey_options')
        .select('option_text')
        .eq('survey_id', survey.id)
        .order('order_number')

      if (optionsError) throw optionsError

      setSelectedSurvey({
        ...survey,
        options: optionsData.map(opt => opt.option_text)
      })
      onOpen()
    } catch (error) {
      console.error('Błąd podczas pobierania opcji ankiety:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać opcji ankiety',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      const { error } = await supabase.from('surveys').delete().eq('id', surveyId)
      if (error) throw error

      // Aktualizuj stan lokalnie
      setSurveys(prev => prev.filter(survey => survey.id !== surveyId))
      
      // Jeśli usuwana ankieta była otwarta, zamknij ją
      if (selectedSurveyForVoting === surveyId) {
        setSelectedSurveyForVoting(null)
      }

      toast({
        title: 'Ankieta usunięta',
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      console.error('Błąd podczas usuwania ankiety:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć ankiety',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleVoteSurvey = (surveyId: string) => {
    setSelectedSurveyForVoting(surveyId === selectedSurveyForVoting ? null : surveyId)
  }

  return (
    <>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={2}>
        <Heading size={{ base: "md", md: "lg" }}>Ankiety</Heading>
        <Button 
          leftIcon={<AddIcon />} 
          colorScheme="blue" 
          onClick={handleCreateSurvey}
          size={{ base: "sm", md: "md" }}
        >
          Nowa ankieta
        </Button>
      </Flex>

      <VStack spacing={4} align="stretch">
        {surveys.map(survey => (
          <Card 
            key={survey.id} 
            bg={cardBg}
            shadow="md"
            borderRadius="lg"
          >
            <CardHeader py={3} px={{ base: 3, md: 5 }}>
              <VStack align="stretch" spacing={2}>
                {/* Tytuł ankiety i status na górze */}
                <Stack 
                  direction={{ base: "column", sm: "row" }} 
                  justify="space-between" 
                  align={{ base: "start", sm: "center" }}
                  spacing={2}
                >
                  <Heading size={{ base: "sm", md: "md" }} noOfLines={2}>
                    {survey.question}
                  </Heading>
                  
                  <Badge 
                    px={2} py={1} 
                    borderRadius="md" 
                    bg={survey.is_active ? activeBadgeBg : inactiveBadgeBg}
                    fontSize={{ base: "xs", md: "sm" }}
                    fontWeight="medium"
                  >
                    {survey.is_active ? "AKTYWNA" : "NIEAKTYWNA"}
                  </Badge>
                </Stack>

                {/* Informacje o ankiecie i przyciski */}
                <Stack 
                  direction={{ base: "column", md: "row" }} 
                  justify="space-between" 
                  align={{ base: "start", md: "center" }}
                  spacing={3}
                >
                  <Stack 
                    direction={{ base: "column", sm: "row" }} 
                    align={{ base: "start", sm: "center" }}
                    spacing={2}
                    flexWrap="wrap"
                  >
                    <Badge 
                      px={2} 
                      py={1} 
                      bg={badgeBg} 
                      borderRadius="md"
                      fontSize={{ base: "xs", md: "sm" }}
                    >
                      {survey.is_multiple ? "WIELOKROTNY WYBÓR" : "POJEDYNCZY WYBÓR"}
                    </Badge>
                    
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                      Twórca: {survey.creator?.name || "Nieznany użytkownik"}
                    </Text>
                  </Stack>

                  <Stack 
                    direction="row" 
                    spacing={2} 
                    align="center"
                    justify={{ base: "flex-start", md: "flex-end" }}
                    width={{ base: "100%", md: "auto" }}
                  >
                    {user?.id === survey.created_by && (
                      <>
                        <IconButton
                          aria-label="Edytuj ankietę"
                          icon={<EditIcon />}
                          onClick={() => handleEditSurvey(survey)}
                          size={{ base: "sm", md: "md" }}
                          colorScheme="blue"
                          variant="ghost"
                        />
                        <IconButton
                          aria-label="Usuń ankietę"
                          icon={<DeleteIcon />}
                          onClick={() => handleDeleteSurvey(survey.id)}
                          size={{ base: "sm", md: "md" }}
                          colorScheme="red"
                          variant="ghost"
                        />
                      </>
                    )}
                    <Button
                      onClick={() => handleVoteSurvey(survey.id)}
                      variant={selectedSurveyForVoting === survey.id ? 'solid' : 'outline'}
                      colorScheme={survey.is_active ? "blue" : "gray"}
                      size={{ base: "sm", md: "md" }}
                      width={{ base: "full", md: "auto" }}
                    >
                      {selectedSurveyForVoting === survey.id ? 'Zamknij' : (survey.is_active ? 'Głosuj' : 'Zobacz wyniki')}
                    </Button>
                  </Stack>
                </Stack>
              </VStack>
            </CardHeader>
            
            {selectedSurveyForVoting === survey.id && (
              <CardBody pt={0} px={{ base: 3, md: 5 }} pb={3}>
                <SurveyVote surveyId={survey.id} />
              </CardBody>
            )}
          </Card>
        ))}

        {surveys.length === 0 && (
          <Box 
            p={6} 
            textAlign="center" 
            borderRadius="lg" 
            borderWidth="1px" 
            borderStyle="dashed"
          >
            <Text>Brak ankiet. Utwórz pierwszą ankietę!</Text>
          </Box>
        )}
      </VStack>

      <SurveyForm
        isOpen={isOpen}
        onClose={onClose}
        survey={selectedSurvey}
        onSurveyCreated={fetchSurveys}
      />
    </>
  )
}

export default Surveys 