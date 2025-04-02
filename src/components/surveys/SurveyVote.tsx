import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  Text,
  Button,
  useToast,
  HStack,
  Avatar,
  AvatarGroup,
  Tooltip,
  Badge,
  Alert,
  AlertIcon,
  Progress,
  Center,
  Spinner,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Flex,
  Stack,
  useBreakpointValue,
} from '@chakra-ui/react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface SurveyVoteProps {
  surveyId: string
}

interface SurveyOption {
  id: string
  option_text: string
  votes?: { id: string }[]
}

interface Vote {
  user_id: string
  option_id: string
  user: {
    email: string
    name: string
    avatar_url?: string
  }
}

interface SurveyDetails {
  id: string
  question: string
  is_multiple: boolean
  is_active: boolean
  created_by: string
  options: SurveyOption[]
  votes: Vote[]
  creator?: {
    name: string
    avatar_url?: string
  }
}

interface SurveyData {
  id: string
  question: string
  is_multiple: boolean
  is_active: boolean
  created_by: string
  creator: {
    name: string | null
    avatar_url: string | null
  } | null
}

interface VoteResult {
  id: string;
  option_text: string;
  votes: number;
  percentage: number;
  voters: {
    email: string;
    name: string;
    avatar_url?: string;
  }[];
}

const ResultsSection = ({ voteResults, onVote, isActive, hasVoted, currentVote }: { 
  voteResults: VoteResult[], 
  onVote?: (optionId: string) => void,
  isActive: boolean,
  hasVoted: boolean,
  currentVote: string | null
}) => {
  // Kolory dostosowane do trybu jasnego i ciemnego
  const selectedBg = useColorModeValue('blue.100', 'blue.700')
  const selectedBorder = useColorModeValue('blue.500', 'blue.300')
  const hoverBg = useColorModeValue('blue.50', 'blue.800')
  const selectedTextColor = useColorModeValue('blue.700', 'white')
  const isSmallScreen = useBreakpointValue({ base: true, md: false })
  
  // Dodajemy kolor tła dla niewybranych opcji
  const defaultBg = useColorModeValue('white', 'gray.700')
  const defaultBorder = useColorModeValue('gray.200', 'gray.600')
  const badgeBg = useColorModeValue('gray.100', 'gray.600')
  const badgeColor = useColorModeValue('gray.800', 'white')
  
  return (
    <VStack align="stretch" spacing={3}>
      <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">
        {isActive 
          ? (hasVoted ? "Zmień swój głos:" : "Zagłosuj:")
          : "Wyniki głosowania:"}
      </Text>
      {voteResults.map(option => (
        <Box 
          key={option.id} 
          p={{ base: 3, md: 4 }}
          borderWidth={1} 
          borderRadius="md"
          cursor={isActive && currentVote !== option.id ? "pointer" : "default"}
          onClick={() => isActive && currentVote !== option.id && onVote?.(option.id)}
          transition="all 0.2s"
          bg={currentVote === option.id ? selectedBg : defaultBg}
          borderColor={currentVote === option.id ? selectedBorder : defaultBorder}
          _hover={isActive && currentVote !== option.id ? {
            bg: hoverBg,
            borderColor: selectedBorder,
          } : undefined}
        >
          <VStack align="stretch" spacing={2}>
            <Stack 
              direction={{ base: "column", sm: "row" }} 
              justify="space-between"
              align={{ base: "start", sm: "center" }}
            >
              <Text 
                fontWeight="bold"
                color={currentVote === option.id ? selectedTextColor : undefined}
                fontSize={{ base: "sm", md: "md" }}
              >
                {option.option_text}
                {currentVote === option.id && (
                  <Text 
                    as="span" 
                    color={selectedTextColor} 
                    ml={2} 
                    fontWeight="bold"
                    fontSize={{ base: "xs", md: "sm" }}
                  >
                    (Twój głos)
                  </Text>
                )}
              </Text>
              <Badge 
                px={2} 
                py={1} 
                bg={currentVote === option.id ? selectedBorder : badgeBg} 
                color={currentVote === option.id ? "white" : badgeColor}
                borderRadius="full"
                fontSize={{ base: "xs", md: "sm" }}
              >
                {option.votes} głosów ({option.percentage}%)
              </Badge>
            </Stack>
            <Progress 
              value={option.percentage} 
              size={{ base: "xs", md: "sm" }} 
              colorScheme={currentVote === option.id ? "blue" : (option.percentage > 50 ? "green" : "blue")}
              borderRadius="full"
            />
            {option.voters.length > 0 && (
              <Stack 
                direction={{ base: "column", sm: "row" }}
                align={{ base: "start", sm: "center" }}
                spacing={2}
                mt={1}
              >
                <Text 
                  fontSize={{ base: "xs", md: "sm" }} 
                  color={currentVote === option.id ? selectedTextColor : "gray.500"}
                  fontWeight="medium"
                >
                  Głosujący:
                </Text>
                <AvatarGroup size={{ base: "xs", md: "sm" }} max={5}>
                  {option.voters.map(voter => (
                    <Tooltip key={voter.email} label={voter.name || voter.email}>
                      <Avatar
                        name={voter.name}
                        src={voter.avatar_url}
                      />
                    </Tooltip>
                  ))}
                </AvatarGroup>
              </Stack>
            )}
          </VStack>
        </Box>
      ))}
    </VStack>
  )
}

const SurveyVote: React.FC<SurveyVoteProps> = ({ surveyId }) => {
  const { user } = useAuth()
  const toast = useToast()
  const [survey, setSurvey] = useState<SurveyDetails | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [currentVote, setCurrentVote] = useState<string | null>(null)
  const [totalVotes, setTotalVotes] = useState(0)

  useEffect(() => {
    fetchSurveyDetails()
    
    // Nasłuchuj zmian w głosach
    const votesSubscription = supabase
      .channel('survey_votes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'survey_votes',
        filter: `survey_id=eq.${surveyId}`
      }, () => {
        fetchSurveyDetails()
      })
      .subscribe()

    // Nasłuchuj zmian w ankiecie (np. zmiana stanu aktywności)
    const surveySubscription = supabase
      .channel('survey_details')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'surveys',
        filter: `id=eq.${surveyId}`
      }, () => {
        fetchSurveyDetails()
      })
      .subscribe()

    return () => {
      votesSubscription.unsubscribe()
      surveySubscription.unsubscribe()
    }
  }, [surveyId])

  const fetchSurveyDetails = async () => {
    try {
      // Pobierz ankietę wraz z opcjami i głosami w jednym zapytaniu
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          id, 
          question, 
          is_multiple, 
          is_active,
          created_by,
          survey_options (
            id,
            option_text,
            order_number
          ),
          survey_votes (
            user_id,
            option_id
          )
        `)
        .eq('id', surveyId)
        .single()

      if (surveyError) throw surveyError
      if (!surveyData) return

      // Pobierz dane twórcy
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', surveyData.created_by)
        .single()

      if (userError) {
        console.error('Błąd podczas pobierania danych twórcy:', userError)
      }

      // Pobierz dane użytkowników, którzy głosowali
      const userIds = [...new Set(surveyData.survey_votes.map(vote => vote.user_id))]
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, avatar_url, name')
        .in('id', userIds)

      if (usersError) throw usersError

      // Połącz dane głosów z danymi użytkowników
      const formattedVotes = surveyData.survey_votes.map(vote => {
        const userData = usersData?.find(user => user.id === vote.user_id)
        return {
          user_id: vote.user_id,
          option_id: vote.option_id,
          user: {
            email: userData?.email || 'Nieznany użytkownik',
            name: userData?.name || userData?.email || 'Nieznany użytkownik',
            avatar_url: userData?.avatar_url
          }
        }
      })

      setSurvey({
        id: surveyData.id,
        question: surveyData.question,
        is_multiple: surveyData.is_multiple,
        is_active: surveyData.is_active,
        created_by: surveyData.created_by,
        options: surveyData.survey_options || [],
        votes: formattedVotes,
        creator: userData ? {
          name: userData.name || 'Nieznany użytkownik',
          avatar_url: userData.avatar_url
        } : undefined
      })

      // Sprawdź czy użytkownik już zagłosował i na którą opcję
      const userVote = formattedVotes.find(vote => vote.user_id === user?.id)
      setHasVoted(!!userVote)
      setCurrentVote(userVote?.option_id || null)
      setTotalVotes(formattedVotes.length)
      setLoading(false)
      setError(null)
    } catch (error) {
      console.error('Błąd podczas pobierania szczegółów ankiety:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać szczegółów ankiety',
        status: 'error',
        duration: 3000,
      })
      setLoading(false)
      setError('Nie udało się pobrać szczegółów ankiety')
    }
  }

  const handleVote = async (optionId: string) => {
    if (!user || !survey) return
    
    // Nie rób nic jeśli użytkownik próbuje zagłosować na tę samą opcję
    if (currentVote === optionId) {
      toast({
        title: 'Już zagłosowałeś na tę opcję',
        status: 'info',
        duration: 3000,
      })
      return
    }

    setIsVoting(true)
    try {
      // Usuń poprzednie głosy użytkownika
      await supabase
        .from('survey_votes')
        .delete()
        .eq('survey_id', surveyId)
        .eq('user_id', user.id)

      // Dodaj nowy głos
      const { error } = await supabase
        .from('survey_votes')
        .insert([{
          survey_id: surveyId,
          user_id: user.id,
          option_id: optionId
        }])

      if (error) throw error

      toast({
        title: hasVoted ? 'Głos został zmieniony' : 'Głos został oddany',
        status: 'success',
        duration: 3000,
        position: 'top'
      })

      // Odśwież dane
      fetchSurveyDetails()
    } catch (error) {
      console.error('Błąd podczas głosowania:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się oddać głosu',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsVoting(false)
    }
  }

  if (loading) return (
    <Center p={4}>
      <Spinner />
    </Center>
  )

  if (error) return (
    <Alert status="error">
      <AlertIcon />
      <AlertTitle>Błąd!</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )

  if (!survey) return null

  // Oblicz wyniki głosowania
  const voteResults = survey.options.map(option => {
    const votesForOption = survey.votes.filter(vote => vote.option_id === option.id)
    const totalVotes = survey.votes.length
    const percentage = totalVotes > 0 ? (votesForOption.length / totalVotes) * 100 : 0

    return {
      ...option,
      votes: votesForOption.length,
      percentage: Math.round(percentage),
      voters: votesForOption.map(vote => vote.user)
    }
  }).sort((a, b) => b.votes - a.votes); // Sortuj według liczby głosów (największe pierwsze)

  return (
    <Box>
      <ResultsSection 
        voteResults={voteResults} 
        onVote={survey.is_active ? handleVote : undefined}
        isActive={survey.is_active}
        hasVoted={hasVoted}
        currentVote={currentVote}
      />
      {!survey.is_active && (
        <Alert status="info" mt={4} borderRadius="md" size="sm">
          <AlertIcon />
          Ta ankieta jest obecnie nieaktywna. Możesz tylko przeglądać wyniki.
        </Alert>
      )}
    </Box>
  )
}

export default SurveyVote 