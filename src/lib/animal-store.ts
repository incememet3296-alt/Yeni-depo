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

async function getOwnedAnimalIds(): Promise<Set<string>> {
  if (!supabase) return new Set()

  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) return new Set()

  const { data, error } = await supabase
    .from('user_animals')
    .select('animal_id')
    .eq('user_id', userId)

  if (error) {
    console.warn('Supabase ownership unavailable; using animal defaults.', error.message)
    return new Set()
  }

  return new Set((data ?? []).map((row) => row.animal_id))
}

async function loadAnimalsWithPositions() {
  if (!supabase) return null

  const [animalsResult, positionsResult, ownedIds] = await Promise.all([
    supabase.from('animals').select(ANIMAL_FIELDS).order('id'),
    supabase.from('animal_positions').select('animal_id,latitude,longitude,altitude'),
    getOwnedAnimalIds(),
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
    return {
      ...animal,
      isOwned: ownedIds.has(animal.id),
      ...(position
        ? { latitude: position.latitude, longitude: position.longitude, altitude: position.altitude }
        : {}),
    }
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

    const [{ data: position }, ownedIds] = await Promise.all([
      supabase
        .from('animal_positions')
        .select('latitude,longitude,altitude')
        .eq('animal_id', id)
        .maybeSingle(),
      getOwnedAnimalIds(),
    ])

    const animal = mapAnimal(data)
    return {
      ...animal,
      isOwned: ownedIds.has(id),
      ...(position
        ? { latitude: position.latitude, longitude: position.longitude, altitude: position.altitude }
        : {}),
    }
  },
}

export function getAnimalStore(): AnimalStore {
  return supabase ? supabaseAnimalStore : localAnimalStore
}
