import { useState, type FormEvent } from 'react'
import type { Vehicle, VehicleInput } from '../types'
import { vehicleSchema } from '../lib/validation'
import { Modal } from './Modal'

const EMPTY: VehicleInput = { plate: '', make: '', model: '', registrationDate: '', notes: '' }

export function VehicleForm({ vehicle, onCancel, onSubmit }: {
  vehicle?: Vehicle
  onCancel: () => void
  onSubmit: (input: VehicleInput) => Promise<void>
}) {
  const [form, setForm] = useState<VehicleInput>(vehicle ? {
    plate: vehicle.plate,
    make: vehicle.make,
    model: vehicle.model,
    registrationDate: vehicle.registrationDate,
    notes: vehicle.notes,
  } : EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = vehicleSchema.safeParse({ ...form, plate: form.plate.toUpperCase() })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Controlla i campi inseriti.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(parsed.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare il veicolo.')
      setSaving(false)
    }
  }

  return (
    <Modal title={vehicle ? 'Modifica veicolo' : 'Nuovo veicolo'} onClose={onCancel} closeDisabled={saving}>
      <form onSubmit={submit} className="form-stack">
        {error && <p className="form-error" role="alert">{error}</p>}
        <label>
          <span>Targa *</span>
          <input autoFocus value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} placeholder="AB123CD" autoCapitalize="characters" maxLength={12} />
        </label>
        <div className="form-grid">
          <label>
            <span>Marca</span>
            <input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Fiat" />
          </label>
          <label>
            <span>Modello</span>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Panda" />
          </label>
        </div>
        <label>
          <span>Data immatricolazione</span>
          <input type="date" value={form.registrationDate} onChange={(e) => setForm({ ...form, registrationDate: e.target.value })} />
        </label>
        <label>
          <span>Note</span>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Intestatario, colore, uso…" />
        </label>
        <div className="modal-actions">
          <button className="button button--ghost" type="button" onClick={onCancel} disabled={saving}>Annulla</button>
          <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
        </div>
      </form>
    </Modal>
  )
}
