import { useMemo, useState } from 'react'
import { AnimalCard } from '../components/Animal/AnimalCard'
import { AnimalInfo } from '../components/Animal/AnimalInfo'
import { useAnimals } from '../hooks/useAnimals'
import { useLocation } from '../hooks/useLocation'
import { calculateDistance } from '../lib/distance'
import type { Animal } from '../types/animal'

const LOCAL_TEST_DISTANCE_METERS = 3
const LOCAL_TEST_BEARINGS = [0, 72, 144, 216, 288]

function offsetCoordinate(latitude: number, longitude: number, distanceMeters: number, bearingDegrees: number) {
  const earthRadius = 6371000
  const bearing = bearingDegrees * Math.PI / 180
  const lat = latitude * Math.PI / 180
  const lon = longitude * Math.PI / 180
  const angularDistance = distanceMeters / earthRadius
  const targetLat = Math.asin(Math.sin(lat) * Math.cos(angularDistance) + Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing))
  const targetLon = lon + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
    Math.cos(angularDistance) - Math.sin(lat) * Math.sin(targetLat),
  )
  return { latitude: targetLat * 180 / Math.PI, longitude: targetLon * 180 / Math.PI }
}

function buildNearbyTestAnimals(animals: Animal[], latitude: number, longitude: number) {
  return animals.slice(0, 5).map((animal, index) => {
    const point = offsetCoordinate(latitude, longitude, LOCAL_TEST_DISTANCE_METERS, LOCAL_TEST_BEARINGS[index])
    return { ...animal, latitude: point.latitude, longitude: point.longitude }
  })
}

export function ExplorePage() {
  const { animals, loading, error } = useAnimals()
  const location = useLocation()
  const [selected, setSelected] = useState<Animal | null>(null)

  const animalsToShow = useMemo(() => {
    if (!location.data || animals.length === 0) return animals
    const realDistances = animals.map((animal) => calculateDistance(
      location.data!.latitude,
      location.data!.longitude,
      animal.latitude,
      animal.longitude,
    ))
    // Keep real Supabase animals when at least one is genuinely nearby.
    // Otherwise use the same 3m local test positions as CameraPage so the
    // Explore screen is useful during development and device testing.
    if (realDistances.some((distance) => distance <= 1000)) return animals
    return buildNearbyTestAnimals(animals, location.data.latitude, location.data.longitude)
  }, [animals, location.data])

  const animalsWithDistance = animalsToShow.map((animal) => {
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
