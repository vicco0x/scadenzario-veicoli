import type { DataMode } from '../types'

const rawMode = (import.meta.env.VITE_DATA_MODE ?? 'local').toLowerCase()
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? ''
).trim()

export const env = {
  dataMode: (rawMode === 'supabase' ? 'supabase' : 'local') as DataMode,
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? '').trim(),
  supabasePublishableKey: publishableKey,
}

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabasePublishableKey)
