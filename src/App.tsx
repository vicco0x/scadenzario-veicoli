import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthScreen } from './components/AuthScreen'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DocumentForm } from './components/DocumentForm'
import { StatusBadge } from './components/StatusBadge'
import { VehicleForm } from './components/VehicleForm'
import { env, hasSupabaseConfig } from './lib/env'
import { compareExpiryDays, compareExpirySeverity, formatDate, getExpiryStatus } from './lib/date'
import { supabase } from './lib/supabase'
import { createRepository } from './repositories'
import type { DataRepository } from './repositories/DataRepository'
import type { DocumentInput, Vehicle, VehicleDocument, VehicleInput } from './types'

function ConfigError() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand brand--auth">
          <div className="brand-mark">IT</div>
          <div><h1>Configurazione Supabase</h1><p>Mancano le variabili d’ambiente necessarie.</p></div>
        </div>
        <div className="config-code">
          <code>VITE_SUPABASE_URL</code>
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
        </div>
        <p className="muted-copy">Compila il file <code>.env</code> oppure imposta <code>VITE_DATA_MODE=local</code> per usare l’archivio locale.</p>
      </section>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(env.dataMode !== 'supabase')

  useEffect(() => {
    if (env.dataMode !== 'supabase' || !supabase) return
    let mounted = true
    void supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session)
      })
      .catch(() => {
        if (mounted) setSession(null)
      })
      .finally(() => {
        if (mounted) setAuthReady(true)
      })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (env.dataMode === 'supabase' && !hasSupabaseConfig) return <ConfigError />
  if (!authReady) return <div className="page-loader">Caricamento…</div>
  if (env.dataMode === 'supabase' && supabase && !session) return <AuthScreen client={supabase} />

  return <VehicleApp key={session?.user.id ?? 'local'} repository={createRepository()} sessionEmail={session?.user.email ?? null} />
}

function VehicleApp({ repository, sessionEmail }: { repository: DataRepository; sessionEmail: string | null }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'soon' | 'ok'>('all')
  const [showAllExpiries, setShowAllExpiries] = useState(false)
  const [vehicleForm, setVehicleForm] = useState<Vehicle | null | undefined>(undefined)
  const [documentForm, setDocumentForm] = useState<{ vehicleId: string; document?: VehicleDocument } | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null)

  async function reload(preferredId?: string | null) {
    const data = await repository.listVehicles()
    setVehicles(data)
    setSelectedId((current) => {
      const target = preferredId ?? current
      if (target && data.some((vehicle) => vehicle.id === target)) return target
      return data[0]?.id ?? null
    })
  }

  useEffect(() => {
    let active = true
    void repository.listVehicles()
      .then((data) => {
        if (!active) return
        setVehicles(data)
        setSelectedId(data[0]?.id ?? null)
      })
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Impossibile caricare i dati.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [repository])

  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? null

  const filteredVehicles = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return vehicles
    return vehicles.filter((vehicle) => [vehicle.plate, vehicle.make, vehicle.model].join(' ').toLowerCase().includes(needle))
  }, [search, vehicles])

  const expiries = useMemo(() => {
    const rows = vehicles.flatMap((vehicle) => vehicle.documents.map((document) => ({ vehicle, document, status: getExpiryStatus(document.expiresOn) })))
    rows.sort((a, b) => compareExpiryDays(a.status.days, b.status.days))
    return rows
  }, [vehicles])

  const visibleExpiries = useMemo(() => expiries.filter(({ status }) => {
    if (expiryFilter === 'expired') return status.days !== null && status.days < 0
    if (expiryFilter === 'soon') return status.days !== null && status.days >= 0 && status.days <= 30
    if (expiryFilter === 'ok') return status.days !== null && status.days > 30
    return true
  }), [expiries, expiryFilter])


  const displayedExpiries = useMemo(
    () => expiryFilter === 'all' && !showAllExpiries ? visibleExpiries.slice(0, 10) : visibleExpiries,
    [expiryFilter, showAllExpiries, visibleExpiries],
  )

  const stats = useMemo(() => {
    let expired = 0
    let soon = 0
    let ok = 0
    for (const { status } of expiries) {
      if (status.days === null) continue
      if (status.days < 0) expired += 1
      else if (status.days <= 30) soon += 1
      else ok += 1
    }
    return { expired, soon, ok }
  }, [expiries])

  function handleError(err: unknown) {
    setError(err instanceof Error ? err.message : 'Si è verificato un errore.')
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) handleError(signOutError)
  }

  async function saveVehicle(input: VehicleInput) {
    let id = vehicleForm?.id
    if (id) await repository.updateVehicle(id, input)
    else id = (await repository.createVehicle(input)).id
    await reload(id)
    setVehicleForm(undefined)
  }

  async function saveDocument(input: DocumentInput) {
    if (!documentForm) return
    if (documentForm.document) await repository.updateDocument(documentForm.vehicleId, documentForm.document.id, input)
    else await repository.createDocument(documentForm.vehicleId, input)
    await reload(documentForm.vehicleId)
    setDocumentForm(null)
  }

  function requestVehicleDelete(vehicle: Vehicle) {
    setConfirm({
      title: 'Elimina veicolo',
      message: `Vuoi eliminare ${vehicle.plate}${vehicle.make || vehicle.model ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}` : ''}? Verranno eliminati anche tutti i documenti associati.`,
      run: async () => {
        try {
          await repository.deleteVehicle(vehicle.id)
          setConfirm(null)
          await reload(null)
        } catch (err) { handleError(err) }
      },
    })
  }

  function requestDocumentDelete(vehicleId: string, document: VehicleDocument) {
    setConfirm({
      title: 'Elimina documento',
      message: `Vuoi eliminare “${document.type}” con scadenza ${formatDate(document.expiresOn)}?`,
      run: async () => {
        try {
          await repository.deleteDocument(vehicleId, document.id)
          setConfirm(null)
          await reload(vehicleId)
        } catch (err) { handleError(err) }
      },
    })
  }

  if (loading) return <div className="page-loader">Caricamento archivio…</div>

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <div className="brand-mark">IT</div>
            <div>
              <h1>Scadenzario Veicoli</h1>
              <p>Bolli, assicurazioni, revisioni e documenti in un unico registro</p>
            </div>
          </div>
          <div className="topbar__actions">
            {sessionEmail && <span className="account-chip" title={sessionEmail}>{sessionEmail}</span>}
            {env.dataMode === 'supabase' && supabase && <button className="button button--ghost-dark" type="button" onClick={() => void signOut()}>Esci</button>}
            <button className="button button--primary-light" type="button" onClick={() => setVehicleForm(null)}>+ Nuovo veicolo</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="alert" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')}>×</button></div>}

        <section className="stats-grid" aria-label="Riepilogo scadenze">
          <button className={`stat-card ${expiryFilter === 'expired' ? 'is-active' : ''}`} onClick={() => setExpiryFilter(expiryFilter === 'expired' ? 'all' : 'expired')}>
            <span className="stat-card__value tone-danger">{stats.expired}</span><span>Scadute</span>
          </button>
          <button className={`stat-card ${expiryFilter === 'soon' ? 'is-active' : ''}`} onClick={() => setExpiryFilter(expiryFilter === 'soon' ? 'all' : 'soon')}>
            <span className="stat-card__value tone-warning">{stats.soon}</span><span>Entro 30 giorni</span>
          </button>
          <button className={`stat-card ${expiryFilter === 'ok' ? 'is-active' : ''}`} onClick={() => setExpiryFilter(expiryFilter === 'ok' ? 'all' : 'ok')}>
            <span className="stat-card__value tone-success">{stats.ok}</span><span>Regolari</span>
          </button>
          <div className="stat-card"><span className="stat-card__value">{vehicles.length}</span><span>Veicoli</span></div>
        </section>

        <section className="panel expiries-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Agenda</p><h2>{expiryFilter === 'expired' ? 'Scadenze arretrate' : expiryFilter === 'soon' ? 'In scadenza entro 30 giorni' : expiryFilter === 'ok' ? 'Scadenze regolari' : 'Prossime scadenze'}</h2></div>
            {expiryFilter !== 'all' && <button className="text-button" onClick={() => setExpiryFilter('all')}>Mostra tutte</button>}
          </div>
          {visibleExpiries.length === 0 ? (
            <div className="empty-block">{expiries.length === 0 ? 'Nessuna scadenza registrata. Aggiungi un documento a un veicolo per iniziare.' : 'Nessuna scadenza corrisponde al filtro selezionato.'}</div>
          ) : (
            <div className="expiry-list">
              {displayedExpiries.map(({ vehicle, document, status }) => (
                <button key={document.id} className="expiry-row" onClick={() => setSelectedId(vehicle.id)}>
                  <span className={`status-dot status-dot--${status.tone}`} aria-hidden="true" />
                  <span className="expiry-row__type">{document.type}</span>
                  <span className="plate plate--compact"><span>I</span><b>{vehicle.plate}</b></span>
                  <span className="expiry-row__vehicle">{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Veicolo senza nome'}</span>
                  <StatusBadge status={status} />
                  <time>{formatDate(document.expiresOn)}</time>
                </button>
              ))}
            </div>
          )}
          {expiryFilter === 'all' && visibleExpiries.length > 10 && (
            <div className="list-footer">
              <p className="list-footnote">{showAllExpiries ? `Mostrate ${visibleExpiries.length} scadenze.` : `Mostrate le prime 10 di ${visibleExpiries.length} scadenze.`}</p>
              <button className="text-button" type="button" onClick={() => setShowAllExpiries((value) => !value)}>{showAllExpiries ? 'Riduci elenco' : 'Mostra tutte'}</button>
            </div>
          )}
        </section>

        <div className="workspace">
          <aside className="panel sidebar">
            <div className="section-heading section-heading--compact"><div><p className="eyebrow">Archivio</p><h2>Veicoli <span className="count-pill">{vehicles.length}</span></h2></div></div>
            <input className="search-input" type="search" placeholder="Cerca targa, marca o modello…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cerca veicolo" />
            <div className="vehicle-list">
              {filteredVehicles.length === 0 ? <div className="empty-block empty-block--small">Nessun veicolo trovato.</div> : filteredVehicles.map((vehicle) => {
                const worst = [...vehicle.documents]
                  .map((document) => getExpiryStatus(document.expiresOn))
                  .sort(compareExpirySeverity)[0]
                return (
                  <button key={vehicle.id} className={`vehicle-item ${selectedId === vehicle.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(vehicle.id)}>
                    <span className="plate plate--compact"><span>I</span><b>{vehicle.plate}</b></span>
                    <strong>{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Veicolo senza nome'}</strong>
                    <small className={worst ? `tone-${worst.tone}` : ''}>{worst?.label ?? 'Nessun documento'}</small>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="panel vehicle-detail">
            {!selected ? (
              <div className="detail-empty"><div className="empty-icon">＋</div><h2>Nessun veicolo selezionato</h2><p>Aggiungi un veicolo oppure selezionalo dall’archivio.</p></div>
            ) : (
              <>
                <div className="detail-header">
                  <div>
                    <span className="plate plate--large"><span>I</span><b>{selected.plate}</b></span>
                    <h2>{[selected.make, selected.model].filter(Boolean).join(' ') || 'Veicolo senza nome'}</h2>
                    <p>{selected.registrationDate ? `Immatricolato il ${formatDate(selected.registrationDate)}` : 'Data di immatricolazione non indicata'}{selected.notes ? ` · ${selected.notes}` : ''}</p>
                  </div>
                  <div className="detail-actions">
                    <button className="button button--ghost" onClick={() => setVehicleForm(selected)}>Modifica</button>
                    <button className="button button--danger-outline" onClick={() => requestVehicleDelete(selected)}>Elimina</button>
                  </div>
                </div>

                <div className="document-heading">
                  <div><p className="eyebrow">Registro</p><h3>Documenti e scadenze</h3></div>
                  <button className="button button--primary button--small" onClick={() => setDocumentForm({ vehicleId: selected.id })}>+ Aggiungi documento</button>
                </div>

                {selected.documents.length === 0 ? <div className="empty-block">Nessun documento registrato per questo veicolo.</div> : (
                  <div className="document-grid">
                    {[...selected.documents].sort((a, b) => compareExpirySeverity(getExpiryStatus(a.expiresOn), getExpiryStatus(b.expiresOn))).map((document) => {
                      const status = getExpiryStatus(document.expiresOn)
                      return (
                        <article className={`document-card document-card--${status.tone}`} key={document.id}>
                          <div className="document-card__top"><strong>{document.type}</strong><StatusBadge status={status} /></div>
                          <time className="document-date">{formatDate(document.expiresOn)}</time>
                          {document.type === 'Assicurazione' && (document.insurer || document.policyNumber) && <div className="document-meta">{document.insurer && <strong>{document.insurer}</strong>}{document.policyNumber && <span>Polizza n. {document.policyNumber}</span>}</div>}
                          {document.notes && <p>{document.notes}</p>}
                          <div className="document-actions"><button onClick={() => setDocumentForm({ vehicleId: selected.id, document })}>Modifica</button><button onClick={() => requestDocumentDelete(selected.id, document)}>Elimina</button></div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <footer className="footer"><span>{env.dataMode === 'supabase' ? 'Sincronizzazione Supabase attiva' : 'Archivio locale sul dispositivo'}</span><span>Scadenzario Veicoli</span></footer>

      {vehicleForm !== undefined && <VehicleForm vehicle={vehicleForm ?? undefined} onCancel={() => setVehicleForm(undefined)} onSubmit={saveVehicle} />}
      {documentForm && <DocumentForm document={documentForm.document} onCancel={() => setDocumentForm(null)} onSubmit={saveDocument} />}
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} onCancel={() => setConfirm(null)} onConfirm={confirm.run} />}
    </div>
  )
}
