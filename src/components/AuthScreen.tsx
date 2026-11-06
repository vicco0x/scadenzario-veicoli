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
  const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin')
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
      if (mode === 'recovery') {
        const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin,
        })
        setMessage(error ? authErrorMessage(error.code) : 'Se l’indirizzo è registrato, riceverai un link per scegliere una nuova password.')
        return
      }

      const result = mode === 'signin'
        ? await client.auth.signInWithPassword({ email: normalizedEmail, password })
        : await client.auth.signUp({
            email: normalizedEmail,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
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
          {mode !== 'recovery' && <label><span>Password</span><input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} pattern={mode === 'signup' ? '(?=.*[A-Za-z])(?=.*\\d).{8,}' : undefined} title={mode === 'signup' ? 'Usa almeno 8 caratteri, con almeno una lettera e un numero.' : undefined} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
          {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
          <button className="button button--primary button--wide" disabled={busy}>{busy ? 'Attendi…' : mode === 'signin' ? 'Accedi' : mode === 'signup' ? 'Crea account' : 'Invia link di recupero'}</button>
        </form>
        <div className="auth-links">
          {mode === 'signin' && <button className="text-button" type="button" onClick={() => { setMode('recovery'); setMessage('') }}>Password dimenticata?</button>}
          <button className="text-button" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>
            {mode === 'signin' ? 'Non hai un account? Registrati' : 'Torna all’accesso'}
          </button>
        </div>
      </section>
    </main>
  )
}

export function PasswordRecoveryScreen({ client }: { client: SupabaseClient<Database> }) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await client.auth.updateUser({ password })
    setMessage(error ? authErrorMessage(error.code) : 'Password aggiornata. Ora puoi continuare a usare il tuo account.')
    setBusy(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand brand--auth">
          <div className="brand-mark">IT</div>
          <div><h1>Nuova password</h1><p>Scegli una password di almeno 8 caratteri.</p></div>
        </div>
        <form onSubmit={submit} className="form-stack">
          <label><span>Nuova password</span><input type="password" autoComplete="new-password" minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,}" title="Usa almeno 8 caratteri, con almeno una lettera e un numero." required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
          <button className="button button--primary button--wide" disabled={busy}>{busy ? 'Attendi…' : 'Aggiorna password'}</button>
        </form>
      </section>
    </main>
  )
}
