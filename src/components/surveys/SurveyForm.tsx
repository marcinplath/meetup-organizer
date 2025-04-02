import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Box,
  IconButton,
  HStack,
  useToast,
  Text,
  Heading,
  Stack,
  FormHelperText,
  useBreakpointValue,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface SurveyFormProps {
  isOpen: boolean
  onClose: () => void
  survey?: Survey
  onSurveyCreated?: () => void
}

interface Survey {
  id?: string
  question: string
  is_multiple: boolean
  is_active: boolean
  created_by?: string
  options: string[]
}

const INITIAL_FORM_STATE: Survey = {
  question: '',
  is_multiple: false,
  is_active: true,
  options: ['']
}

const SurveyForm: React.FC<SurveyFormProps> = ({
  isOpen,
  onClose,
  survey,
  onSurveyCreated
}) => {
  const { user } = useAuth()
  const toast = useToast()
  const isSmallScreen = useBreakpointValue({ base: true, md: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Survey>(INITIAL_FORM_STATE)

  useEffect(() => {
    if (survey) {
      setFormData(survey)
    } else {
      setFormData(INITIAL_FORM_STATE)
    }
  }, [survey, isOpen])

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, question: e.target.value }))
  }

  const handleOptionChange = (index: number, value: string) => {
    setFormData(prev => {
      const newOptions = [...prev.options]
      newOptions[index] = value
      return { ...prev, options: newOptions }
    })
  }

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }))
  }

  const removeOption = (index: number) => {
    if (formData.options.length > 1) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_: string, i: number) => i !== index)
      }))
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const surveyData = {
        question: formData.question,
        is_multiple: formData.is_multiple,
        is_active: formData.is_active,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }

      let surveyId = survey?.id
      let error

      if (surveyId) {
        // Aktualizacja ankiety
        const { error: updateError } = await supabase
          .from('surveys')
          .update(surveyData)
          .eq('id', surveyId)
        error = updateError

        if (!error) {
          // Aktualizacja opcji
          const existingOptions = formData.options
            .filter(option => option.trim() !== '')
            .map((option, index) => ({
              survey_id: surveyId,
              option_text: option,
              order_number: index
            }))

          // Pobierz istniejące opcje
          const { data: currentOptions } = await supabase
            .from('survey_options')
            .select('id, option_text, order_number')
            .eq('survey_id', surveyId)
            .order('order_number')

          // Aktualizuj tylko zmienione opcje
          if (currentOptions) {
            for (let i = 0; i < existingOptions.length; i++) {
              const currentOption = currentOptions[i]
              const newOption = existingOptions[i]

              if (currentOption) {
                // Aktualizuj istniejącą opcję
                if (currentOption.option_text !== newOption.option_text) {
                  await supabase
                    .from('survey_options')
                    .update({ option_text: newOption.option_text, order_number: i })
                    .eq('id', currentOption.id)
                }
              } else {
                // Dodaj nową opcję
                await supabase
                  .from('survey_options')
                  .insert([newOption])
              }
            }

            // Usuń nadmiarowe opcje
            if (currentOptions.length > existingOptions.length) {
              await supabase
                .from('survey_options')
                .delete()
                .eq('survey_id', surveyId)
                .gte('order_number', existingOptions.length)
            }
          }
        }
      } else {
        // Tworzenie nowej ankiety
        const { data: newSurvey, error: insertError } = await supabase
          .from('surveys')
          .insert([surveyData])
          .select()
        error = insertError
        surveyId = newSurvey?.[0]?.id

        if (!error && surveyId) {
          // Dodaj opcje dla nowej ankiety
          const optionsToInsert = formData.options
            .filter(option => option.trim() !== '')
            .map((option, index) => ({
              survey_id: surveyId,
              option_text: option,
              order_number: index
            }))

          const { error: optionsError } = await supabase
            .from('survey_options')
            .insert(optionsToInsert)

          if (optionsError) throw optionsError
        }
      }

      if (error) throw error

      toast({
        title: survey?.id ? 'Ankieta zaktualizowana' : 'Ankieta utworzona',
        status: 'success',
        duration: 3000,
      })

      onSurveyCreated?.()
      onClose()
    } catch (error) {
      console.error('Błąd podczas zapisywania ankiety:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać ankiety',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(INITIAL_FORM_STATE)
    onClose()
  }

  const isFormValid = formData.question.trim() !== '' && 
                     formData.options.filter(opt => opt.trim() !== '').length >= 1

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size={isSmallScreen ? "full" : "xl"}
      motionPreset={isSmallScreen ? "slideInBottom" : "scale"}
    >
      <ModalOverlay />
      <ModalContent borderRadius={isSmallScreen ? 0 : "md"}>
        <ModalHeader>
          <Heading size="md">
            {survey?.id ? 'Edytuj ankietę' : 'Utwórz nową ankietę'}
          </Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5}>
            <FormControl isRequired>
              <FormLabel fontWeight="medium">Pytanie</FormLabel>
              <Input
                value={formData.question}
                onChange={handleQuestionChange}
                placeholder="Wprowadź pytanie"
                size={isSmallScreen ? "md" : "lg"}
              />
            </FormControl>

            <Stack 
              width="100%" 
              direction={{ base: "column", md: "row" }} 
              spacing={6}
              justify="space-between"
            >
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" fontWeight="medium">Wielokrotny wybór</FormLabel>
                <Switch
                  isChecked={formData.is_multiple}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, is_multiple: e.target.checked }))
                  }
                  colorScheme="blue"
                  size={isSmallScreen ? "md" : "lg"}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" fontWeight="medium">Aktywna</FormLabel>
                <Switch
                  isChecked={formData.is_active}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, is_active: e.target.checked }))
                  }
                  colorScheme="green"
                  size={isSmallScreen ? "md" : "lg"}
                />
              </FormControl>
            </Stack>

            <Box w="100%" pt={2}>
              <FormControl>
                <FormLabel fontWeight="medium">Opcje odpowiedzi</FormLabel>
                <FormHelperText mb={3}>
                  Dodaj co najmniej jedną opcję odpowiedzi
                </FormHelperText>
                <VStack spacing={3} align="start">
                  {formData.options.map((option, index) => (
                    <HStack key={index} width="100%">
                      <Input
                        value={option}
                        onChange={e => handleOptionChange(index, e.target.value)}
                        placeholder={`Opcja ${index + 1}`}
                        size={isSmallScreen ? "md" : "lg"}
                      />
                      <IconButton
                        aria-label="Usuń opcję"
                        icon={<DeleteIcon />}
                        colorScheme="red"
                        variant="ghost"
                        size={isSmallScreen ? "sm" : "md"}
                        onClick={() => removeOption(index)}
                        isDisabled={formData.options.length === 1}
                      />
                    </HStack>
                  ))}
                  <Button
                    leftIcon={<AddIcon />}
                    size={isSmallScreen ? "sm" : "md"}
                    onClick={addOption}
                    colorScheme="blue"
                    variant="outline"
                    width={{ base: "full", md: "auto" }}
                  >
                    Dodaj opcję
                  </Button>
                </VStack>
              </FormControl>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Stack 
            direction={{ base: "column", sm: "row" }} 
            spacing={3} 
            width={{ base: "100%", sm: "auto" }}
          >
            <Button 
              variant="outline" 
              onClick={handleClose}
              width={{ base: "100%", sm: "auto" }}
            >
              Anuluj
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={!isFormValid}
              width={{ base: "100%", sm: "auto" }}
            >
              {survey?.id ? 'Zapisz zmiany' : 'Utwórz ankietę'}
            </Button>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SurveyForm 