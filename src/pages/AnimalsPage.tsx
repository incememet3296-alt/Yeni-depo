import { useState } from 'react'
import { ANIMALS } from '../data/animals'
import { AnimalCard } from '../components/Animal/AnimalCard'
import { AnimalInfo } from '../components/Animal/AnimalInfo'
import type { Animal } from '../types/animal'

export function AnimalsPage() {
  const [selected, setSelected] = useState<Animal | null>(null)
  const owned = ANIMALS.filter((a) => a.isOwned)
  const discovered = ANIMALS

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
          <span className="stat-number">{discovered.length}</span>
          <span className="stat-text">Keşfedilen</span>
        </div>
      </div>

      <h2 className="section-title">Tüm Hayvanlar</h2>
      <div className="animals-grid">
        {ANIMALS.map((animal) => (
          <AnimalCard
            key={animal.id}
            animal={animal}
            onClick={() => setSelected(animal)}
          />
        ))}
      </div>

      <AnimalInfo
        animal={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
