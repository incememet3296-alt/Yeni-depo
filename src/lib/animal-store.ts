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

const ANIMAL_FIELDS = 'id,name,species,description,image,latitude,longitude,altitude,rarity,level,is_owned'

async function loadAnimalsWithPositions() {
  if (!supabase) return null

  const [animalsResult, positionsResult] = await Promise.all([
    supabase.from('animals').select(ANIMAL_FIELDS).order('id'),
    supabase.from('animal_positions').select('animal_id,latitude,longitude,altitude'),
  ])

  if (animalsResult.error || !animalsResult.data) {
    console.warn('Supabase animals unavailable; using local fallback.', animalsResult.error?.message)
    return null
  }

  const positions = new Map(
    (positionsResult.data ?? []).map((position) => [position.animal_id, position]),
  )

  return animalsResult.data.map((row) => {
    const animal = mapAnimal(row)
    const position = positions.get(animal.id)
    return position
      ? { ...animal, latitude: position.latitude, longitude: position.longitude, altitude: position.altitude }
      : animal
  })
}

export const supabaseAnimalStore: AnimalStore = {
  async listAnimals() {
    const animals = await loadAnimalsWithPositions()
    return animals ?? localAnimalStore.listAnimals()
  },

  async getAnimal(id) {
    if (!supabase) return localAnimalStore.getAnimal(id)

    const { data, error } = await supabase
      .from('animals')
      .select(ANIMAL_FIELDS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.warn('Supabase animal lookup failed; using local fallback.', error.message)
      return localAnimalStore.getAnimal(id)
    }

    if (!data) return null

    const { data: position } = await supabase
      .from('animal_positions')
      .select('latitude,longitude,altitude')
      .eq('animal_id', id)
      .maybeSingle()

    const animal = mapAnimal(data)
    return position
      ? { ...animal, latitude: position.latitude, longitude: position.longitude, altitude: position.altitude }
      : animal
  },
}

export function getAnimalStore(): AnimalStore {
  return supabase ? supabaseAnimalStore : localAnimalStore
}
