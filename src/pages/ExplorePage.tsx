import { useState } from 'react'
import { AnimalCard } from '../components/Animal/AnimalCard'
import { AnimalInfo } from '../components/Animal/AnimalInfo'
import { useAnimals } from '../hooks/useAnimals'
import { useLocation } from '../hooks/useLocation'
import { calculateDistance } from '../lib/distance'
import type { Animal } from '../types/animal'

export function ExplorePage() {
  const { animals, loading, error } = useAnimals()
  const location = useLocation()
  const [selected, setSelected] = useState<Animal | null>(null)

  const animalsWithDistance = animals.map((animal) => {
    let distance: number | undefined
    if (location.data) {
      distance = calculateDistance(
        location.data.latitude,
        location.data.longitude,
        animal.latitude,
        animal.longitude,
      )
    }
    return { animal, distance }
  })

  const sorted = [...animalsWithDistance].sort((a, b) => {
    if (a.distance == null) return 1
    if (b.distance == null) return -1
    return a.distance - b.distance
  })

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1>Keşfet</h1>
        <p>Yakındaki sanal hayvanları keşfet.</p>
        {location.data && (
          <div className="location-info">
            <span>📍 {location.data.latitude.toFixed(4)}, {location.data.longitude.toFixed(4)}</span>
            <span>±{Math.round(location.data.accuracy)}m</span>
          </div>
        )}
        {location.status === 'permission-denied' && (
          <div className="location-warning">
            Konum izni gerekli. Sanal hayvanları bulunduğun gerçek dünyadaki konumlarına göre gösterebilmek için konum erişimine izin ver.
          </div>
        )}
        {error && <div className="location-warning">{error}</div>}
      </div>

      {loading ? (
        <p>Hayvanlar yükleniyor…</p>
      ) : (
        <div className="explore-list">
          {sorted.map(({ animal, distance }) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              distance={distance}
              onClick={() => setSelected(animal)}
            />
          ))}
        </div>
      )}

      <AnimalInfo
        animal={selected}
        distance={selected && location.data
          ? calculateDistance(location.data.latitude, location.data.longitude, selected.latitude, selected.longitude)
          : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
