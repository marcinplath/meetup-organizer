import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Avatar,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Divider,
  IconButton,
  useColorModeValue,
  Textarea,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Badge,
  Center,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
  Container,
  Flex,
  SimpleGrid,
  GridItem
} from '@chakra-ui/react'
import { EditIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  name: string
  email: string
  bio: string | null
  avatar_url: string | null
  is_admin: boolean
}

const Profile = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const bgColor = useColorModeValue('white', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setEditedProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać danych profilu',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setEditedProfile(profile)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editedProfile || !user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editedProfile.name,
          bio: editedProfile.bio,
        })
        .eq('id', user.id)

      if (error) throw error

      setProfile(editedProfile)
      setIsEditing(false)
      toast({
        title: 'Profil zaktualizowany',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować profilu',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setIsEditing(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (!editedProfile) return

    setEditedProfile({
      ...editedProfile,
      [name]: value
    })
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase.rpc('delete_user', { user_id: user?.id });
      
      if (error) throw error;
      
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: 'Konto zostało usunięte',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Błąd podczas usuwania konta',
        description: 'Spróbuj ponownie później',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Sprawdź rozmiar pliku (2MB = 2 * 1024 * 1024 bajtów)
    const maxSize = 2 * 1024 * 1024 // 2MB w bajtach
    if (file.size > maxSize) {
      toast({
        title: 'Błąd',
        description: 'Rozmiar zdjęcia nie może przekraczać 2MB',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    // Sprawdź typ pliku
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({
        title: 'Błąd',
        description: 'Dozwolone są tylko pliki w formacie JPEG, PNG lub WebP',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    setIsUploadingAvatar(true)
    try {
      // Usuń stare zdjęcie jeśli istnieje
      if (profile?.avatar_url) {
        const oldAvatarPath = profile.avatar_url.split('/').pop()
        if (oldAvatarPath) {
          await supabase.storage
            .from('avatars')
            .remove([oldAvatarPath])
        }
      }

      // Generuj unikalną nazwę pliku
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Prześlij nowe zdjęcie
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) {
        if (uploadError.message.includes('size')) {
          throw new Error('Rozmiar zdjęcia nie może przekraczać 2MB')
        } else if (uploadError.message.includes('type')) {
          throw new Error('Niedozwolony format pliku')
        }
        throw uploadError
      }

      // Pobierz publiczny URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Zaktualizuj profil użytkownika
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Zaktualizuj stan lokalny
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      
      toast({
        title: 'Sukces',
        description: 'Zdjęcie profilowe zostało zaktualizowane',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zaktualizować zdjęcia profilowego',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return

    try {
      // Usuń plik ze storage
      const avatarPath = profile.avatar_url.split('/').pop()
      if (avatarPath) {
        await supabase.storage
          .from('avatars')
          .remove([avatarPath])
      }

      // Zaktualizuj profil użytkownika
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Zaktualizuj stan lokalny
      setProfile(prev => prev ? { ...prev, avatar_url: null } : null)

      toast({
        title: 'Sukces',
        description: 'Zdjęcie profilowe zostało usunięte',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error removing avatar:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć zdjęcia profilowego',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (isLoading) {
    return (
      <Center p={6} minH="300px">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (!profile) {
    return (
      <Center p={6} minH="300px">
        <Text>Nie znaleziono profilu</Text>
      </Center>
    )
  }

  return (
    <Box w="full" px={{ base: 2, md: 4, lg: 6 }}>
      {/* Układ mobilny (niezmieniony) */}
      <Box display={{ base: "block", lg: "none" }}>
        <SimpleGrid
          columns={{ base: 1 }}
          spacing={{ base: 6 }}
        >
          {/* Sekcja z awatarem i podstawowymi informacjami */}
          <Box 
            p={{ base: 4, md: 6 }}
            bg={bgColor}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius="lg"
            boxShadow="sm"
          >
            <VStack spacing={6} align="center">
              <Box position="relative">
                <Menu>
                  <MenuButton
                    as={Box}
                    cursor="pointer"
                    position="relative"
                    _hover={{ opacity: 0.8 }}
                  >
                    <Avatar
                      size={{ base: "xl", md: "2xl" }}
                      name={profile.name}
                      src={profile.avatar_url || undefined}
                    />
                    {isUploadingAvatar && (
                      <Center
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        bg="blackAlpha.600"
                        borderRadius="full"
                      >
                        <Spinner color="white" />
                      </Center>
                    )}
                  </MenuButton>
                  <Portal>
                    <MenuList zIndex={1500}>
                      <MenuItem onClick={handleAvatarClick}>
                        Zmień zdjęcie
                      </MenuItem>
                      {profile.avatar_url && (
                        <MenuItem onClick={handleRemoveAvatar} color="red.500">
                          Usuń zdjęcie
                        </MenuItem>
                      )}
                    </MenuList>
                  </Portal>
                </Menu>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </Box>
              <VStack spacing={2}>
                <Heading size={{ base: "lg", md: "xl" }}>{profile.name}</Heading>
                <Text fontSize="md" color="gray.500">{profile.email}</Text>
                {profile.is_admin && (
                  <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>
                    Administrator
                  </Badge>
                )}
              </VStack>
              
              <Box w="full" pt={4}>
                <Divider mb={4} />
                <Text fontWeight="medium" mb={2}>Bio</Text>
                <Text color="gray.600" whiteSpace="pre-wrap">
                  {profile.bio || 'Brak opisu'}
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Sekcja ustawień */}
          <Box
            p={{ base: 4, md: 6 }}
            bg={bgColor}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius="lg"
            boxShadow="sm"
          >
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center" wrap="wrap">
                <Heading size="md" mb={{ base: 2, md: 0 }}>Ustawienia profilu</Heading>
                
                {!isEditing ? (
                  <IconButton
                    aria-label="Edytuj profil"
                    icon={<EditIcon />}
                    onClick={handleEdit}
                    variant="ghost"
                  />
                ) : (
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Zapisz zmiany"
                      icon={<CheckIcon />}
                      onClick={handleSave}
                      colorScheme="blue"
                    />
                    <IconButton
                      aria-label="Anuluj edycję"
                      icon={<CloseIcon />}
                      onClick={handleCancel}
                      variant="ghost"
                    />
                  </HStack>
                )}
              </Flex>

              <Divider />

              <VStack spacing={5} align="stretch">
                <FormControl>
                  <FormLabel>Imię i nazwisko</FormLabel>
                  <Input
                    name="name"
                    value={isEditing ? editedProfile?.name : profile.name}
                    onChange={handleChange}
                    isReadOnly={!isEditing}
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={profile.email}
                    isReadOnly
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Bio</FormLabel>
                  <Textarea
                    name="bio"
                    value={isEditing ? (editedProfile?.bio ?? '') : (profile.bio ?? '')}
                    onChange={handleChange}
                    isReadOnly={!isEditing}
                    placeholder="Napisz coś o sobie..."
                    rows={4}
                    size="md"
                  />
                </FormControl>
              </VStack>
            </VStack>
          </Box>

          {/* Danger Zone dla widoku mobilnego */}
          <Box
            p={{ base: 4, md: 6 }}
            bg={bgColor}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius="lg"
            boxShadow="sm"
          >
            <VStack spacing={4} align="stretch">
              <Heading size="md" color="red.500">Danger Zone</Heading>
              <Text color="gray.600">
                Te akcje nie mogą być cofnięte. Proszę być pewnym.
              </Text>
              <Button
                colorScheme="red"
                variant="outline"
                onClick={onOpen}
                size={{ base: "md" }}
                w={{ base: "full", md: "auto" }}
              >
                Usuń konto
              </Button>
            </VStack>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Nowy układ dla desktopa */}
      <Box display={{ base: "none", lg: "block" }}>
        <HStack spacing={8} align="stretch">
          {/* Lewa kolumna - profil */}
          <VStack
            spacing={6}
            align="center"
            flex="1"
            maxW="350px"
            bg={bgColor}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius="lg"
            boxShadow="md"
            p={6}
            h="auto"
            minH="100%"
            alignSelf="stretch"
          >
            <Box position="relative">
              <Menu>
                <MenuButton
                  as={Box}
                  cursor="pointer"
                  position="relative"
                  _hover={{ opacity: 0.8 }}
                >
                  <Avatar
                    size="2xl"
                    name={profile.name}
                    src={profile.avatar_url || undefined}
                    boxShadow="lg"
                  />
                  {isUploadingAvatar && (
                    <Center
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bg="blackAlpha.600"
                      borderRadius="full"
                    >
                      <Spinner color="white" />
                    </Center>
                  )}
                </MenuButton>
                <Portal>
                  <MenuList zIndex={1500}>
                    <MenuItem onClick={handleAvatarClick}>
                      Zmień zdjęcie
                    </MenuItem>
                    {profile.avatar_url && (
                      <MenuItem onClick={handleRemoveAvatar} color="red.500">
                        Usuń zdjęcie
                      </MenuItem>
                    )}
                  </MenuList>
                </Portal>
              </Menu>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </Box>
            <VStack spacing={2} mb={2}>
              <Heading size="xl" textAlign="center">{profile.name}</Heading>
              <Text fontSize="md" color="gray.500">{profile.email}</Text>
              {profile.is_admin && (
                <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
                  Administrator
                </Badge>
              )}
            </VStack>
            
            <Divider w="70%" my={4} />
            
            <Box w="full" flex="1">
              <Text fontWeight="bold" fontSize="lg" mb={3}>Bio</Text>
              <Text fontSize="md" color="gray.600" whiteSpace="pre-wrap">
                {profile.bio || 'Brak opisu'}
              </Text>
            </Box>
          </VStack>

          {/* Prawa kolumna - ustawienia i danger zone */}
          <VStack
            flex="2"
            spacing={6}
            align="stretch"
          >
            {/* Ustawienia profilu */}
            <Box
              bg={bgColor}
              borderWidth={1}
              borderColor={borderColor}
              borderRadius="lg"
              boxShadow="md"
              p={8}
            >
              <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center" wrap="wrap">
                  <Heading size="lg">Ustawienia profilu</Heading>
                  
                  {!isEditing ? (
                    <IconButton
                      aria-label="Edytuj profil"
                      icon={<EditIcon />}
                      onClick={handleEdit}
                      variant="ghost"
                      size="lg"
                    />
                  ) : (
                    <HStack spacing={3}>
                      <IconButton
                        aria-label="Zapisz zmiany"
                        icon={<CheckIcon />}
                        onClick={handleSave}
                        colorScheme="blue"
                        size="lg"
                      />
                      <IconButton
                        aria-label="Anuluj edycję"
                        icon={<CloseIcon />}
                        onClick={handleCancel}
                        variant="ghost"
                        size="lg"
                      />
                    </HStack>
                  )}
                </Flex>

                <Divider />

                <VStack spacing={8} align="stretch" py={4}>
                  <FormControl>
                    <FormLabel fontSize="lg">Imię i nazwisko</FormLabel>
                    <Input
                      name="name"
                      value={isEditing ? editedProfile?.name : profile.name}
                      onChange={handleChange}
                      isReadOnly={!isEditing}
                      size="lg"
                      fontSize="md"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="lg">Email</FormLabel>
                    <Input
                      name="email"
                      type="email"
                      value={profile.email}
                      isReadOnly
                      size="lg"
                      fontSize="md"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="lg">Bio</FormLabel>
                    <Textarea
                      name="bio"
                      value={isEditing ? (editedProfile?.bio ?? '') : (profile.bio ?? '')}
                      onChange={handleChange}
                      isReadOnly={!isEditing}
                      placeholder="Napisz coś o sobie..."
                      rows={6}
                      size="lg"
                      fontSize="md"
                      resize="vertical"
                    />
                  </FormControl>
                </VStack>
              </VStack>
            </Box>
            
            {/* Danger Zone - przeniesiona pod ustawienia profilu */}
            <Box
              bg={bgColor}
              borderWidth={1}
              borderColor={borderColor}
              borderRadius="lg"
              boxShadow="md"
              p={6}
            >
              <VStack spacing={4} align="stretch">
                <Heading size="md" color="red.500">Danger Zone</Heading>
                <Text color="gray.600" fontSize="sm">
                  Te akcje nie mogą być cofnięte. Proszę być pewnym.
                </Text>
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={onOpen}
                  size="md"
                  w={{ base: "full", md: "auto" }}
                >
                  Usuń konto
                </Button>
              </VStack>
            </Box>
          </VStack>
        </HStack>
      </Box>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Usuń konto
            </AlertDialogHeader>

            <AlertDialogBody>
              Czy na pewno chcesz usunąć swoje konto? Tej operacji nie można cofnąć.
              Wszystkie Twoje dane zostaną trwale usunięte.
            </AlertDialogBody>

            <AlertDialogFooter flexDirection={{ base: "column", sm: "row" }} gap={2}>
              <Button ref={cancelRef} onClick={onClose} w={{ base: "full", sm: "auto" }}>
                Anuluj
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteAccount} 
                ml={{ base: 0, sm: 3 }}
                w={{ base: "full", sm: "auto" }}
                isLoading={isDeleting}
              >
                Usuń konto
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}

export default Profile 