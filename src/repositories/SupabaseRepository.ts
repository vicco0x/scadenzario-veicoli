import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'
import type { DataRepository } from './DataRepository'
import type { DocumentInput, Vehicle, VehicleDocument, VehicleInput } from '../types'

type VehicleRow = Database['public']['Tables']['vehicles']['Row']
type DocumentRow = Database['public']['Tables']['vehicle_documents']['Row']

function mapDocument(row: DocumentRow): VehicleDocument {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    type: row.type,
    expiresOn: row.expires_on,
    insurer: row.insurer ?? '',
    policyNumber: row.policy_number ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapVehicle(row: VehicleRow, documents: DocumentRow[] = []): Vehicle {
  return {
    id: row.id,
    plate: row.plate,
    make: row.make ?? '',
    model: row.model ?? '',
    registrationDate: row.registration_date ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documents: documents.filter((document) => document.vehicle_id === row.id).map(mapDocument),
  }
}

export class SupabaseRepository implements DataRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async userId(): Promise<string> {
    const { data, error } = await this.client.auth.getSession()
    if (error || !data.session) throw new Error('Sessione non valida. Accedi nuovamente.')
    return data.session.user.id
  }


  async listVehicles(): Promise<Vehicle[]> {
    const userId = await this.userId()
    const { data, error } = await this.client
      .from('vehicles')
      .select('*, vehicle_documents(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .order('expires_on', { referencedTable: 'vehicle_documents', ascending: true })

    if (error) throw error

    return ((data ?? []) as Array<VehicleRow & { vehicle_documents: DocumentRow[] }>).map((row) =>
      mapVehicle(row, row.vehicle_documents ?? []),
    )
  }

  async createVehicle(input: VehicleInput): Promise<Vehicle> {
    const { data, error } = await this.client
      .from('vehicles')
      .insert({
        plate: input.plate,
        make: input.make,
        model: input.model,
        registration_date: input.registrationDate || null,
        notes: input.notes,
      })
      .select('*')
      .single()
    if (error) throw error.code === '23505' ? new Error('Esiste già un veicolo con questa targa.') : error
    return mapVehicle(data)
  }

  async updateVehicle(id: string, input: VehicleInput): Promise<Vehicle> {
    const { data, error } = await this.client
      .from('vehicles')
      .update({
        plate: input.plate,
        make: input.make,
        model: input.model,
        registration_date: input.registrationDate || null,
        notes: input.notes,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error.code === '23505' ? new Error('Esiste già un veicolo con questa targa.') : error
    return mapVehicle(data)
  }

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await this.client.from('vehicles').delete().eq('id', id)
    if (error) throw error
  }

  async createDocument(vehicleId: string, input: DocumentInput): Promise<void> {
    const { error } = await this.client.from('vehicle_documents').insert({
      vehicle_id: vehicleId,
      type: input.type,
      expires_on: input.expiresOn,
      insurer: input.insurer,
      policy_number: input.policyNumber,
      notes: input.notes,
    })
    if (error) throw error
  }

  async updateDocument(_vehicleId: string, documentId: string, input: DocumentInput): Promise<void> {
    const { error } = await this.client
      .from('vehicle_documents')
      .update({
        type: input.type,
        expires_on: input.expiresOn,
        insurer: input.insurer,
        policy_number: input.policyNumber,
        notes: input.notes,
      })
      .eq('id', documentId)
    if (error) throw error
  }

  async deleteDocument(_vehicleId: string, documentId: string): Promise<void> {
    const { error } = await this.client.from('vehicle_documents').delete().eq('id', documentId)
    if (error) throw error
  }
}
