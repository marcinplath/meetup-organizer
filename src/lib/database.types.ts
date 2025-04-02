export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url?: string
          bio?: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar_url?: string
          bio?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string
          bio?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string
          date: string
          time: string
          location: string
          type: 'one-time' | 'recurring'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          date: string
          time: string
          location: string
          type: 'one-time' | 'recurring'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          date?: string
          time?: string
          location?: string
          type?: 'one-time' | 'recurring'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
      }
      event_participants: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: 'pending' | 'accepted' | 'declined'
          joined_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: 'pending' | 'accepted' | 'declined'
          joined_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          joined_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      auth_error: 'invalid_credentials' | 'email_not_confirmed' | 'invalid_email' | 'weak_password' | 'email_already_in_use'
    }
  }
} 