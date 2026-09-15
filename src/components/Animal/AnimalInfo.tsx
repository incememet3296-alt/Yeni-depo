import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import type { Animal } from '../../types/animal'

interface AnimalInfoProps {
  animal: Animal | null
  distance?: number
  onClose: () => void
  onApproach?: () => void
  onInspect?: () => void
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Yaygın',
  uncommon: 'Nadir',
  rare: 'Çok Nadir',
  legendary: 'Efsanevi',
}

export function AnimalInfo({
  animal,
  distance,
  onClose,
  onApproach,
  onInspect,
}: AnimalInfoProps) {
  return (
    <Modal open={!!animal} onClose={onClose} ariaLabel="Hayvan bilgisi">
      {animal && (
        <div className="animal-info">
          <div className="animal-info-image">
            <img src={animal.image} alt={animal.name} />
          </div>
          <h2>{animal.name}</h2>
          <p className="animal-info-species">{animal.species}</p>
          <p className="animal-info-desc">{animal.description}</p>
          <div className="animal-info-stats">
            <div className="stat">
              <span className="stat-label">Mesafe</span>
              <span className="stat-value">{distance != null ? `${Math.round(distance)}m` : '—'}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Nadirlik</span>
              <span className={`stat-value rarity-${animal.rarity}`}>
                {RARITY_LABELS[animal.rarity]}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Seviye</span>
              <span className="stat-value">{animal.level}</span>
            </div>
          </div>
          <div className="animal-info-actions">
            {onApproach && (
              <Button variant="secondary" onClick={onApproach}>Yaklaş</Button>
            )}
            {onInspect && (
              <Button onClick={onInspect}>Hayvanı İncele</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
