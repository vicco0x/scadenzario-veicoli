import { z } from 'zod'
import { DOCUMENT_TYPES } from '../types'

const plateRegex = /^[A-Z0-9-]{3,12}$/i
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value: string): boolean {
  if (!dateRegex.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const optionalDate = z.string().refine((value) => !value || isValidDate(value), 'Data non valida.')

export const vehicleSchema = z.object({
  plate: z.string().trim().min(1, 'La targa è obbligatoria.').max(12, 'La targa è troppo lunga.').regex(plateRegex, 'Usa solo lettere, numeri e trattini.'),
  make: z.string().trim().max(60, 'Marca troppo lunga.'),
  model: z.string().trim().max(80, 'Modello troppo lungo.'),
  registrationDate: optionalDate,
  notes: z.string().trim().max(500, 'Le note possono contenere massimo 500 caratteri.'),
})

export const documentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  expiresOn: z.string().min(1, 'La data di scadenza è obbligatoria.').refine(isValidDate, 'Data di scadenza non valida.'),
  insurer: z.string().trim().max(100, 'Nome compagnia troppo lungo.'),
  policyNumber: z.string().trim().max(80, 'Numero polizza troppo lungo.'),
  notes: z.string().trim().max(500, 'Le note possono contenere massimo 500 caratteri.'),
})
