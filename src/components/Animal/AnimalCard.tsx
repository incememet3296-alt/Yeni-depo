import type { Animal } from '../../types/animal'

interface AnimalCardProps {
  animal: Animal
  distance?: number
  onClick?: () => void
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Yaygın',
  uncommon: 'Nadir',
  rare: 'Çok Nadir',
  legendary: 'Efsanevi',
}

export function AnimalCard({ animal, distance, onClick }: AnimalCardProps) {
  return (
    <button className="animal-card" onClick={onClick} aria-label={animal.name}>
      <div className="animal-card-image">
        <img src={animal.image} alt={animal.name} />
      </div>
      <div className="animal-card-info">
        <h3>{animal.name}</h3>
        <p className="animal-species">{animal.species}</p>
        <div className="animal-card-meta">
          <span className={`rarity rarity-${animal.rarity}`}>
            {RARITY_LABELS[animal.rarity]}
          </span>
          <span className="level-badge">Sv. {animal.level}</span>
        </div>
        {distance != null && (
          <p className="animal-distance">{Math.round(distance)}m uzakta</p>
        )}
      </div>
    </button>
  )
}
