import { useState, type FormEvent } from 'react'
import { documentSchema } from '../lib/validation'
import { DOCUMENT_TYPES, type DocumentInput, type VehicleDocument } from '../types'
import { Modal } from './Modal'

const EMPTY: DocumentInput = { type: 'Bollo', expiresOn: '', insurer: '', policyNumber: '', notes: '' }

export function DocumentForm({ document, onCancel, onSubmit }: {
  document?: VehicleDocument
  onCancel: () => void
  onSubmit: (input: DocumentInput) => Promise<void>
}) {
  const [form, setForm] = useState<DocumentInput>(document ? {
    type: document.type,
    expiresOn: document.expiresOn,
    insurer: document.insurer,
    policyNumber: document.policyNumber,
    notes: document.notes,
  } : EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalized = form.type === 'Assicurazione' ? form : { ...form, insurer: '', policyNumber: '' }
    const parsed = documentSchema.safeParse(normalized)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Controlla i campi inseriti.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(parsed.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare il documento.')
      setSaving(false)
    }
  }

  return (
    <Modal title={document ? 'Modifica documento' : 'Nuovo documento'} onClose={onCancel} closeDisabled={saving}>
      <form onSubmit={submit} className="form-stack">
        {error && <p className="form-error" role="alert">{error}</p>}
        <label>
          <span>Tipo</span>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DocumentInput['type'] })}>
            {DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span>Data di scadenza *</span>
          <input autoFocus type="date" value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} />
        </label>
        {form.type === 'Assicurazione' && (
          <div className="form-grid">
            <label>
              <span>Compagnia</span>
              <input value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} placeholder="Generali" />
            </label>
            <label>
              <span>Numero polizza</span>
              <input value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} placeholder="123456789" />
            </label>
          </div>
        )}
        <label>
          <span>Note</span>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informazioni utili…" />
        </label>
        <div className="modal-actions">
          <button className="button button--ghost" type="button" onClick={onCancel} disabled={saving}>Annulla</button>
          <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
        </div>
      </form>
    </Modal>
  )
}
