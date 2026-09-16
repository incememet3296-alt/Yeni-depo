import { useCallback, useEffect, useState } from 'react'
import { getAnimalStore } from '../lib/animal-store'
import type { Animal } from '../types/animal'

export function useMyPet() {
  const [pet, setPet] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const owned = await getAnimalStore().listOwnedAnimals()
      setPet(owned[0] ?? null)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Sanal hayvanınız yüklenemedi.')
      setPet(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { pet, loading, error, reload: load }
}
