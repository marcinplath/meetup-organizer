import { createClient } from '@supabase/supabase-js'
import { User, Event, Group, GroupMember, EventParticipant } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Brak wymaganych zmiennych środowiskowych dla Supabase')
}

// Najprostsza konfiguracja
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Funkcja do obsługi potwierdzania emaila
export const handleEmailConfirmation = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Brak aktywnej sesji')
    }
    
    return session
  } catch (error) {
    console.error('Błąd podczas potwierdzania emaila:', error)
    throw error
  }
}

// Funkcja do czyszczenia sesji
export const clearSession = async () => {
  try {
    console.log('[clearSession] Rozpoczynam czyszczenie sesji...')
    console.log('[clearSession] Wylogowuję z Supabase...')
    await supabase.auth.signOut()
    console.log('[clearSession] Czyszczę localStorage...')
    window.localStorage.clear()
    console.log('[clearSession] Odświeżam stronę...')
    window.location.href = '/'
  } catch (error) {
    console.error('[clearSession] Błąd podczas czyszczenia sesji:', error)
    throw error
  }
}

export type { User, Event, Group, GroupMember, EventParticipant } 