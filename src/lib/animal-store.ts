import { ANIMALS } from '../data/animals'
import type { Animal } from '../types/animal'
import { supabase } from './supabase'

export interface AnimalStore {
  listAnimals(): Promise<Animal[]>
  getAnimal(id: string): Promise<Animal | null>
  listOwnedAnimals(): Promise<Animal[]>
  purchaseAnimal(id: string): Promise<Animal>
  setActiveAnimal(id: string): Promise<void>
}

export const localAnimalStore: AnimalStore = {
  async listAnimals() {
    return ANIMALS
  },
  async getAnimal(id) {
    return ANIMALS.find((animal) => animal.id === id) ?? null
  },
  async listOwnedAnimals() {
    return ANIMALS.filter((animal) => animal.isOwned)
  },
  async purchaseAnimal(id) {
    const animal = ANIMALS.find((item) => item.id === id)
    if (!animal) throw new Error('Hayvan bulunamadı.')
    return { ...animal, isOwned: true }
  },
  async setActiveAnimal() {
    return
  },
}

const ANIMAL_FIELDS = 'id,name,species,description,image,latitude,longitude,altitude,rarity,level,is_owned,price_tl,is_for_sale,follow_distance_m'

type AnimalRow = {
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
  price_tl: number
  is_for_sale: boolean
  follow_distance_m: number
}

const mapAnimal = (row: AnimalRow): Animal => ({
  ...row,
  rarity: row.rarity as Animal['rarity'],
  isOwned: row.is_owned,
  priceTl: Number(row.price_tl ?? 0),
  isForSale: Boolean(row.is_for_sale),
  followDistanceM: Number(row.follow_distance_m ?? 1.5),
})

async function getCurrentUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

async function requireCurrentUserId() {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Bu işlem için giriş yapmalısınız.')
  return userId
}

async function getOwnedAnimalIds(): Promise<Set<string>> {
  const userId = await getCurrentUserId()
  if (!supabase || !userId) return new Set()
  const { data, error } = await supabase.from('user_animals').select('animal_id').eq('user_id', userId)
  if (error) throw new Error(`Sahiplik bilgileri alınamadı: ${error.message}`)
  return new Set((data ?? []).map((row) => row.animal_id))
}

async function loadAnimalsWithPositions() {
  if (!supabase) return null
  const [animalsResult, positionsResult, ownedIds] = await Promise.all([
    supabase.from('animals').select(ANIMAL_FIELDS).order('id'),
    supabase.from('animal_positions').select('animal_id,latitude,longitude,altitude'),
    getOwnedAnimalIds(),
  ])
  if (animalsResult.error || !animalsResult.data) return null
  const positions = new Map((positionsResult.data ?? []).map((position) => [position.animal_id, position]))
  return animalsResult.data.map((row) => {
    const animal = mapAnimal(row as AnimalRow)
    const position = positions.get(animal.id)
    return {
      ...animal,
      isOwned: ownedIds.has(animal.id),
      ...(position ? { latitude: position.latitude, longitude: position.longitude, altitude: position.altitude } : {}),
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
    const { data, error } = await supabase.from('animals').select(ANIMAL_FIELDS).eq('id', id).maybeSingle()
    if (error || !data) return error ? localAnimalStore.getAnimal(id) : null
    const [{ data: position }, ownedIds] = await Promise.all([
      supabase.from('animal_positions').select('latitude,longitude,altitude').eq('animal_id', id).maybeSingle(),
      getOwnedAnimalIds(),
    ])
    const animal = mapAnimal(data as AnimalRow)
    return { ...animal, isOwned: ownedIds.has(id), ...(position ? { latitude: position.latitude, longitude: position.longitude, altitude: position.altitude } : {}) }
  },
  async listOwnedAnimals() {
    if (!supabase) return localAnimalStore.listOwnedAnimals()
    const userId = await getCurrentUserId()
    if (!userId) return []
    const { data, error } = await supabase.from('user_animals').select('animal_id').eq('user_id', userId).order('purchased_at', { ascending: true })
    if (error) throw new Error(`Sahip olunan hayvanlar alınamadı: ${error.message}`)
    if (!data?.length) return []
    const { data: animals, error: animalError } = await supabase.from('animals').select(ANIMAL_FIELDS).in('id', data.map((row) => row.animal_id))
    if (animalError) throw new Error(`Hayvanlar alınamadı: ${animalError.message}`)
    return (animals ?? []).map((row) => ({ ...mapAnimal(row as AnimalRow), isOwned: true }))
  },
  async purchaseAnimal(id) {
    if (!supabase) return localAnimalStore.purchaseAnimal(id)
    const userId = await requireCurrentUserId()
    const { data: animalRow, error: animalError } = await supabase.from('animals').select(ANIMAL_FIELDS).eq('id', id).eq('is_for_sale', true).maybeSingle()
    if (animalError || !animalRow) throw new Error('Bu hayvan şu anda satışta değil.')
    const { data: existing } = await supabase.from('user_animals').select('animal_id').eq('user_id', userId).eq('animal_id', id).maybeSingle()
    if (existing) return { ...mapAnimal(animalRow as AnimalRow), isOwned: true }
    const { error } = await supabase.from('user_animals').insert({ user_id: userId, animal_id: id, is_active: false })
    if (error) throw new Error(`Satın alma tamamlanamadı: ${error.message}`)
    return { ...mapAnimal(animalRow as AnimalRow), isOwned: true }
  },
  async setActiveAnimal(id) {
    if (!supabase) return
    const userId = await requireCurrentUserId()
    const { error: clearError } = await supabase.from('user_animals').update({ is_active: false }).eq('user_id', userId)
    if (clearError) throw new Error(`Aktif hayvan değiştirilemedi: ${clearError.message}`)
    const { error } = await supabase.from('user_animals').update({ is_active: true }).eq('user_id', userId).eq('animal_id', id)
    if (error) throw new Error(`Hayvan aktif edilemedi: ${error.message}`)
  },
}

export function getAnimalStore(): AnimalStore {
  return supabase ? supabaseAnimalStore : localAnimalStore
}
