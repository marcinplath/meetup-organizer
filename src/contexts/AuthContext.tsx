import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url?: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Funkcja do pobierania profilu użytkownika
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Błąd podczas pobierania profilu:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Nieoczekiwany błąd podczas pobierania profilu:', error)
      return null
    }
  }

  // Funkcja do aktualizacji stanu użytkownika
  const updateUserState = async (session: { user: User } | null) => {
    if (session?.user) {
      setUser(session.user)
      const userProfile = await fetchUserProfile(session.user.id)
      setProfile(userProfile)
    } else {
      setUser(null)
      setProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Sprawdź aktualną sesję
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateUserState(session)
    })

    // Nasłuchuj zmian w autoryzacji
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      updateUserState(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true)
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })
      if (signUpError) throw signUpError

      if (data.user) {
        // Po udanej rejestracji, utwórz profil użytkownika
        const { error: profileError } = await supabase.from('users').insert([
          {
            id: data.user.id,
            email,
            name,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        if (profileError) throw profileError
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 