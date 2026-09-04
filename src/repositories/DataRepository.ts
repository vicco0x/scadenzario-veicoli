import type { DocumentInput, Vehicle, VehicleInput } from '../types'

export interface DataRepository {
  listVehicles(): Promise<Vehicle[]>
  createVehicle(input: VehicleInput): Promise<Vehicle>
  updateVehicle(id: string, input: VehicleInput): Promise<Vehicle>
  deleteVehicle(id: string): Promise<void>
  createDocument(vehicleId: string, input: DocumentInput): Promise<void>
  updateDocument(vehicleId: string, documentId: string, input: DocumentInput): Promise<void>
  deleteDocument(vehicleId: string, documentId: string): Promise<void>
}
