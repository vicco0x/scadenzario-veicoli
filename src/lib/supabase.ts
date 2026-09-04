import { createClient } from '@supabase/supabase-js'
import { env, hasSupabaseConfig } from './env'
import type { Database } from './database.types'

export const supabase = hasSupabaseConfig
  ? createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
