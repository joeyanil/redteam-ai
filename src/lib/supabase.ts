import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type DbProject = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type DbFile = {
  id: string
  project_id: string
  name: string
  path: string
  content: string
  type: 'file' | 'folder'
  created_at: string
  updated_at: string
}

export type DbSession = {
  id: string
  project_id: string | null
  title: string
  open_file_ids: string[]
  active_file_id: string | null
  created_at: string
  updated_at: string
}

export type DbMessage = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
