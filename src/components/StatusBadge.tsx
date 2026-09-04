import type { ExpiryStatus } from '../types'

export function StatusBadge({ status }: { status: ExpiryStatus }) {
  return <span className={`status status--${status.tone}`}>{status.label}</span>
}
