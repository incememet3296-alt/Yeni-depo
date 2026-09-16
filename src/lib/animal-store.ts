import { ANIMALS } from '../data/animals'
import type { Animal } from '../types/animal'

/**
 * Virtual Animal data boundary.
 *
 * IMPORTANT: this module intentionally has no dependency on MySkyParcel,
 * its Supabase project, or its environment variables.
 * A separate Supabase project can implement this interface later.
 */
export interface AnimalStore {
  listAnimals(): Promise<Animal[]>
  getAnimal(id: string): Promise<Animal | null>
}

/** Local provider keeps the app fully functional until the dedicated
 * Virtual Animal Supabase project is provisioned.
 */
export const localAnimalStore: AnimalStore = {
  async listAnimals() {
    return ANIMALS
  },
  async getAnimal(id) {
    return ANIMALS.find((animal) => animal.id === id) ?? null
  },
}

/**
 * Explicit provider factory. The remote provider is deliberately not
 * implemented until a NEW, dedicated Supabase URL/key is supplied.
 */
export function getAnimalStore(): AnimalStore {
  return localAnimalStore
}
