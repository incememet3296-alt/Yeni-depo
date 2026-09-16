import { useState } from 'react'
import { AnimalCard } from '../components/Animal/AnimalCard'
import { AnimalInfo } from '../components/Animal/AnimalInfo'
import { useAnimals } from '../hooks/useAnimals'
import type { Animal } from '../types/animal'

export function AnimalsPage() {
  const { animals, loading, error } = useAnimals()
  const [selected, setSelected] = useState<Animal | null>(null)
  const owned = animals.filter((animal) => animal.isOwned)

  return (
    <div className="animals-page">
      <div className="animals-header">
        <h1>Hayvanlarım</h1>
        <p>Keşfettiğin ve sahiplendiğin hayvanlar.</p>
      </div>

      <div className="animals-stats">
        <div className="stat-pill">
          <span className="stat-number">{owned.length}</span>
          <span className="stat-text">Sahiplenilen</span>
        </div>
        <div className="stat-pill">
          <span className="stat-number">{animals.length}</span>
          <span className="stat-text">Keşfedilen</span>
        </div>
      </div>

      {error && <p className="status-message warning">{error}</p>}
      {loading ? (
        <p>Hayvanlar yükleniyor…</p>
      ) : (
        <>
          <h2 className="section-title">Tüm Hayvanlar</h2>
          <div className="animals-grid">
            {animals.map((animal) => (
              <AnimalCard
                key={animal.id}
                animal={animal}
                onClick={() => setSelected(animal)}
              />
            ))}
          </div>
        </>
      )}

      <AnimalInfo
        animal={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
