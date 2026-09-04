import { useState } from 'react'
import { Modal } from './Modal'

export function ConfirmDialog({ title, message, confirmLabel = 'Elimina', onCancel, onConfirm }: {
  title: string
  message: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onCancel} closeDisabled={busy}>
      <p className="confirm-copy">{message}</p>
      <div className="modal-actions">
        <button className="button button--ghost" type="button" onClick={onCancel} disabled={busy}>Annulla</button>
        <button className="button button--danger" type="button" onClick={() => void confirm()} disabled={busy}>{busy ? 'Eliminazione…' : confirmLabel}</button>
      </div>
    </Modal>
  )
}
