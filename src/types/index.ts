export interface Event {
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
  user?: {
    name: string
    avatar_url: string
  }
}

export interface Survey {
  id: string
  title: string
  description: string
  options: string[]
  created_by: string
  created_at: string
  user?: {
    name: string
    avatar_url: string
  }
}

export interface Story {
  id: string
  content: string
  user_id: string
  created_at: string
  expires_at: string
  user?: {
    name: string
    avatar_url: string
  }
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined'
  joined_at: string
} 