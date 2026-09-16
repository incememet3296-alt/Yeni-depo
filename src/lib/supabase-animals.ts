import { supabase } from './supabase'
import type { Animal } from '../types/animal'

export async function listRemoteAnimals(): Promise<Animal[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('animals')
    .select('id,name,species,description,image,latitude,longitude,altitude,rarity,level,is_owned,price_tl,is_for_sale,follow_distance_m')
    .order('id')

  if (error || !data) {
    console.warn('Unable to load animals from Supabase.', error?.message)
    return []
  }

  return data.map((animal) => ({
    id: animal.id,
    name: animal.name,
    species: animal.species,
    description: animal.description,
    image: animal.image,
    latitude: animal.latitude,
    longitude: animal.longitude,
    altitude: animal.altitude,
    rarity: animal.rarity as Animal['rarity'],
    level: animal.level,
    isOwned: animal.is_owned,
    priceTl: Number(animal.price_tl ?? 0),
    isForSale: Boolean(animal.is_for_sale),
    followDistanceM: Number(animal.follow_distance_m ?? 1.5),
  }))
}
