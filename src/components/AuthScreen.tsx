import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'

function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Email o password non corretti.'
    case 'email_address_invalid':
      return 'Inserisci un indirizzo email valido.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Esiste già un account con questa email. Prova ad accedere.'
    case 'weak_password':
      return 'Scegli una password più sicura.'
    case 'over_email_send_rate_limit':
      return 'Troppe richieste in poco tempo. Attendi qualche minuto e riprova.'
    default:
      return 'Impossibile completare la richiesta. Riprova.'
  }
}

export function AuthScreen({ client }: { client: SupabaseClient<Database> }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = mode === 'signin'
        ? await client.auth.signInWithPassword({ email: normalizedEmail, password })
        : await client.auth.signUp({ email: normalizedEmail, password })
      if (result.error) {
        setMessage(authErrorMessage(result.error.code))
        return
      }
      if (mode === 'signup' && !result.data.session) {
        setMessage('Account creato. Controlla la tua email per confermare la registrazione.')
      }
    } catch {
      setMessage('Impossibile contattare il servizio di autenticazione. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand brand--auth">
          <div className="brand-mark">IT</div>
          <div>
            <h1>Scadenzario Veicoli</h1>
            <p>I tuoi veicoli e le loro scadenze, sincronizzati.</p>
          </div>
        </div>
        <form onSubmit={submit} className="form-stack">
          <label><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label><span>Password</span><input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
          <button className="button button--primary button--wide" disabled={busy}>{busy ? 'Attendi…' : mode === 'signin' ? 'Accedi' : 'Crea account'}</button>
        </form>
        <button className="text-button" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>
          {mode === 'signin' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
      </section>
    </main>
  )
}
