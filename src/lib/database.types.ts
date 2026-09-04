export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string
          user_id: string
          plate: string
          make: string
          model: string
          registration_date: string | null
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          plate: string
          make?: string
          model?: string
          registration_date?: string | null
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plate?: string
          make?: string
          model?: string
          registration_date?: string | null
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_documents: {
        Row: {
          id: string
          user_id: string
          vehicle_id: string
          type: 'Bollo' | 'Assicurazione' | 'Revisione' | 'Altro'
          expires_on: string
          insurer: string
          policy_number: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          vehicle_id: string
          type: 'Bollo' | 'Assicurazione' | 'Revisione' | 'Altro'
          expires_on: string
          insurer?: string
          policy_number?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vehicle_id?: string
          type?: 'Bollo' | 'Assicurazione' | 'Revisione' | 'Altro'
          expires_on?: string
          insurer?: string
          policy_number?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehicle_documents_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
