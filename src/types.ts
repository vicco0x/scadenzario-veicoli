export const DOCUMENT_TYPES = ['Bollo', 'Assicurazione', 'Revisione', 'Altro'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export type VehicleDocument = {
  id: string
  vehicleId: string
  type: DocumentType
  expiresOn: string
  insurer: string
  policyNumber: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type Vehicle = {
  id: string
  plate: string
  make: string
  model: string
  registrationDate: string
  notes: string
  createdAt: string
  updatedAt: string
  documents: VehicleDocument[]
}

export type VehicleInput = Pick<Vehicle, 'plate' | 'make' | 'model' | 'registrationDate' | 'notes'>
export type DocumentInput = Pick<VehicleDocument, 'type' | 'expiresOn' | 'insurer' | 'policyNumber' | 'notes'>

export type ExpiryTone = 'danger' | 'warning' | 'success' | 'muted'
export type ExpiryStatus = {
  key: 'expired' | 'today' | 'soon' | 'ok' | 'none'
  label: string
  days: number | null
  tone: ExpiryTone
}

export type DataMode = 'local' | 'supabase'
