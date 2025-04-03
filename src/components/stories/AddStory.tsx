import React, { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  VStack,
  useToast,
  Text
} from '@chakra-ui/react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface AddStoryProps {
  isOpen: boolean
  onClose: () => void
  onStoryAdded?: () => void
}

export const AddStory: React.FC<AddStoryProps> = ({ isOpen, onClose, onStoryAdded }) => {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const toast = useToast()

  const handleSubmit = async () => {
    if (!content.trim() || !user) return

    setIsLoading(true)
    try {
      // Przygotowanie daty wygaśnięcia - 24h od teraz
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Sprawdzamy czy użytkownik już ma notatkę
      const { data: existingStories, error: checkError } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', user.id);

      if (checkError) {
        throw checkError;
      }

      // Jeśli użytkownik ma już jakieś notatki, usuń je wszystkie
      if (existingStories && existingStories.length > 0) {
        const { error: deleteError } = await supabase
          .from('stories')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Teraz dodaj nową notatkę
      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          content: content.trim(),
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: 'Notatka dodana!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      setContent('')
      onClose()
      onStoryAdded?.()
    } catch (error) {
      console.error('Błąd podczas dodawania notatki:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać notatki',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg="gray.800">
        <ModalHeader color="white">Dodaj notatkę</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <Text color="gray.300" fontSize="sm">
              Twoja notatka będzie widoczna przez 24 godziny
            </Text>
            <Input
              placeholder="Co słychać?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              bg="gray.700"
              color="white"
              border="none"
              _focus={{ 
                border: 'none',
                ring: 2,
                ringColor: 'blue.500'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
            />
            <Button
              colorScheme="blue"
              width="full"
              onClick={handleSubmit}
              isLoading={isLoading}
              isDisabled={!content.trim()}
            >
              Dodaj notatkę
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 