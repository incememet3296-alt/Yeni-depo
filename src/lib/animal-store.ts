import { ANIMALS } from '../data/animals'
import type { Animal } from '../types/animal'
import { supabase } from './supabase'

export interface AnimalStore {
  listAnimals(): Promise<Animal[]>
  getAnimal(id: string): Promise<Animal | null>
}

export const localAnimalStore: AnimalStore = {
  async listAnimals() {
    return ANIMALS
  },
  async getAnimal(id) {
    return ANIMALS.find((animal) => animal.id === id) ?? null
  },
}

const mapAnimal = (row: {
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
}): Animal => ({
  ...row,
  rarity: row.rarity as Animal['rarity'],
  isOwned: row.is_owned,
})

export const supabaseAnimalStore: AnimalStore = {
  async listAnimals() {
    if (!supabase) return localAnimalStore.listAnimals()

    const { data, error } = await supabase
      .from('animals')
      .select('id,name,species,description,image,latitude,longitude,altitude,rarity,level,is_owned')
      .order('id')

    if (error || !data) {
      console.warn('Supabase animals unavailable; using local fallback.', error?.message)
      return localAnimalStore.listAnimals()
    }

    return data.map(mapAnimal)
  },

  async getAnimal(id) {
    if (!supabase) return localAnimalStore.getAnimal(id)

    const { data, error } = await supabase
      .from('animals')
      .select('id,name,species,description,image,latitude,longitude,altitude,rarity,level,is_owned')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.warn('Supabase animal lookup failed; using local fallback.', error.message)
      return localAnimalStore.getAnimal(id)
    }

    return data ? mapAnimal(data) : null
  },
}

export function getAnimalStore(): AnimalStore {
  return supabase ? supabaseAnimalStore : localAnimalStore
}
