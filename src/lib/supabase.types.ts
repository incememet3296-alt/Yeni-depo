export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      animals: {
        Row: {
          id: string
          name: string
          species: string
          description: string
          image: string
          latitude: number
          longitude: number
          altitude: number
          rarity: string
          level: number
          is_owned: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['animals']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['animals']['Insert']>
        Relationships: []
      }
      animal_positions: {
        Row: { animal_id: string; latitude: number; longitude: number; altitude: number; updated_at: string }
        Insert: { animal_id: string; latitude: number; longitude: number; altitude?: number; updated_at?: string }
        Update: Partial<Database['public']['Tables']['animal_positions']['Insert']>
        Relationships: []
      }
      user_animals: {
        Row: { user_id: string; animal_id: string; created_at: string }
        Insert: { user_id: string; animal_id: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['user_animals']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
