import { useEffect, useState } from 'react'
import { getAnimalStore } from '../lib/animal-store'
import type { Animal } from '../types/animal'

export function useAnimals(ownedOnly = false) {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const request = ownedOnly ? getAnimalStore().listOwnedAnimals() : getAnimalStore().listAnimals()
    void request
      .then((items) => {
        if (!cancelled) setAnimals(items)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Hayvanlar yüklenemedi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [ownedOnly])

  return { animals, loading, error }
}
