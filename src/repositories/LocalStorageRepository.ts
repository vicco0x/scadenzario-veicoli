import type { DataRepository } from './DataRepository'
import { DOCUMENT_TYPES, type DocumentInput, type DocumentType, type Vehicle, type VehicleInput } from '../types'

const STORAGE_KEY = 'scadenzario-veicoli:v2'
const LEGACY_KEY = 'scadenzario-veicoli'

const nowIso = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

function read(): Vehicle[] {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current) return JSON.parse(current) as Vehicle[]

    const legacy = localStorage.getItem(LEGACY_KEY)
    if (!legacy) return []
    const parsed = JSON.parse(legacy) as Array<Record<string, unknown>>
    const migrated = parsed.map((vehicle) => migrateLegacyVehicle(vehicle))
    write(migrated)
    return migrated
  } catch {
    return []
  }
}

function write(vehicles: Vehicle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles))
}

function migrateLegacyVehicle(raw: Record<string, unknown>): Vehicle {
  const vehicleId = String(raw.id ?? uid())
  const createdAt = nowIso()
  const docs = Array.isArray(raw.documenti) ? raw.documenti : []
  return {
    id: vehicleId,
    plate: String(raw.targa ?? '').toUpperCase(),
    make: String(raw.marca ?? ''),
    model: String(raw.modello ?? ''),
    registrationDate: String(raw.immatricolazione ?? ''),
    notes: String(raw.note ?? ''),
    createdAt,
    updatedAt: createdAt,
    documents: docs.map((item) => {
      const doc = item as Record<string, unknown>
      return {
        id: String(doc.id ?? uid()),
        vehicleId,
        type: DOCUMENT_TYPES.includes(String(doc.tipo ?? '') as DocumentType) ? String(doc.tipo) as DocumentType : 'Altro',
        expiresOn: String(doc.scadenza ?? ''),
        insurer: String(doc.compagnia ?? ''),
        policyNumber: String(doc.numeroPolizza ?? ''),
        notes: String(doc.note ?? ''),
        createdAt,
        updatedAt: createdAt,
      }
    }),
  }
}

export class LocalStorageRepository implements DataRepository {
  async listVehicles(): Promise<Vehicle[]> {
    return read()
  }

  async createVehicle(input: VehicleInput): Promise<Vehicle> {
    const vehicles = read()
    const normalizedInput = { ...input, plate: input.plate.trim().toUpperCase() }
    if (vehicles.some((vehicle) => vehicle.plate === normalizedInput.plate)) {
      throw new Error('Esiste già un veicolo con questa targa.')
    }
    const createdAt = nowIso()
    const vehicle: Vehicle = {
      id: uid(),
      ...normalizedInput,
      createdAt,
      updatedAt: createdAt,
      documents: [],
    }
    write([...vehicles, vehicle])
    return vehicle
  }

  async updateVehicle(id: string, input: VehicleInput): Promise<Vehicle> {
    const vehicles = read()
    const normalizedInput = { ...input, plate: input.plate.trim().toUpperCase() }
    if (vehicles.some((vehicle) => vehicle.id !== id && vehicle.plate === normalizedInput.plate)) {
      throw new Error('Esiste già un veicolo con questa targa.')
    }
    const index = vehicles.findIndex((vehicle) => vehicle.id === id)
    if (index < 0) throw new Error('Veicolo non trovato.')
    const current = vehicles[index]
    if (!current) throw new Error('Veicolo non trovato.')
    const updated: Vehicle = { ...current, ...normalizedInput, updatedAt: nowIso() }
    vehicles[index] = updated
    write(vehicles)
    return updated
  }

  async deleteVehicle(id: string): Promise<void> {
    write(read().filter((vehicle) => vehicle.id !== id))
  }

  async createDocument(vehicleId: string, input: DocumentInput): Promise<void> {
    const vehicles = read()
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    if (!vehicle) throw new Error('Veicolo non trovato.')
    const createdAt = nowIso()
    vehicle.documents.push({ id: uid(), vehicleId, ...input, createdAt, updatedAt: createdAt })
    vehicle.updatedAt = createdAt
    write(vehicles)
  }

  async updateDocument(vehicleId: string, documentId: string, input: DocumentInput): Promise<void> {
    const vehicles = read()
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    if (!vehicle) throw new Error('Veicolo non trovato.')
    const index = vehicle.documents.findIndex((document) => document.id === documentId)
    if (index < 0) throw new Error('Documento non trovato.')
    const current = vehicle.documents[index]
    if (!current) throw new Error('Documento non trovato.')
    vehicle.documents[index] = { ...current, ...input, updatedAt: nowIso() }
    vehicle.updatedAt = nowIso()
    write(vehicles)
  }

  async deleteDocument(vehicleId: string, documentId: string): Promise<void> {
    const vehicles = read()
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    if (!vehicle) throw new Error('Veicolo non trovato.')
    vehicle.documents = vehicle.documents.filter((document) => document.id !== documentId)
    vehicle.updatedAt = nowIso()
    write(vehicles)
  }
}
