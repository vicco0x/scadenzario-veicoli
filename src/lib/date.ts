import type { ExpiryStatus } from '../types'

const DAY_MS = 86_400_000

function parseDateParts(date: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null
  return [year, month, day]
}

function todayUtcStamp(): number {
  const now = new Date()
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

export function daysUntil(date: string): number | null {
  const parts = parseDateParts(date)
  if (!parts) return null
  return Math.round((Date.UTC(parts[0], parts[1] - 1, parts[2]) - todayUtcStamp()) / DAY_MS)
}

export function getExpiryStatus(date: string): ExpiryStatus {
  const days = daysUntil(date)
  if (days === null) return { key: 'none', label: 'Senza scadenza', days, tone: 'muted' }
  if (days < 0) return { key: 'expired', label: `Scaduto da ${Math.abs(days)} ${Math.abs(days) === 1 ? 'giorno' : 'giorni'}`, days, tone: 'danger' }
  if (days === 0) return { key: 'today', label: 'Scade oggi', days, tone: 'danger' }
  if (days <= 30) return { key: 'soon', label: `Scade tra ${days} ${days === 1 ? 'giorno' : 'giorni'}`, days, tone: 'warning' }
  return { key: 'ok', label: `Scade tra ${days} giorni`, days, tone: 'success' }
}

export function formatDate(date: string): string {
  const parts = parseDateParts(date)
  if (!parts) return '—'
  const parsed = new Date(parts[0], parts[1] - 1, parts[2])
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export function compareExpiryDays(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1

  // Default agenda: upcoming/today first, then recently expired.
  const aFuture = a >= 0
  const bFuture = b >= 0
  if (aFuture !== bFuture) return aFuture ? -1 : 1
  if (aFuture) return a - b
  return b - a
}

export function compareExpirySeverity(a: ExpiryStatus, b: ExpiryStatus): number {
  const rank: Record<ExpiryStatus['key'], number> = { expired: 0, today: 1, soon: 2, ok: 3, none: 4 }
  const severity = rank[a.key] - rank[b.key]
  if (severity !== 0) return severity
  if (a.days === null || b.days === null) return 0
  return a.days - b.days
}

export function sortByExpiry<T extends { expiresOn: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareExpiryDays(daysUntil(a.expiresOn), daysUntil(b.expiresOn)))
}
