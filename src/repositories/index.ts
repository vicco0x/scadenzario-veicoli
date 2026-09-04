import type { DataRepository } from './DataRepository'
import { LocalStorageRepository } from './LocalStorageRepository'
import { SupabaseRepository } from './SupabaseRepository'
import { env } from '../lib/env'
import { supabase } from '../lib/supabase'

let repository: DataRepository | null = null

export function createRepository(): DataRepository {
  if (repository) return repository

  if (env.dataMode === 'supabase') {
    if (!supabase) throw new Error('Configurazione Supabase mancante. Compila VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nel file .env.')
    repository = new SupabaseRepository(supabase)
    return repository
  }

  repository = new LocalStorageRepository()
  return repository
}
