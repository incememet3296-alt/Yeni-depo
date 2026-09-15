import type { Animal } from '../../types/animal'
import type { AnimalPosition } from '../../types/animal'

interface AnimalMarkerProps {
  animal: Animal
  position: AnimalPosition
  screenWidth: number
  fieldOfView: number
  onSelect: () => void
}

import { getScreenOffset, getDistanceScale } from '../../lib/animal-position'
import { DISCOVERY_RADIUS } from '../../lib/animal-position'

export function AnimalMarker({
  animal,
  position,
  screenWidth,
  fieldOfView,
  onSelect,
}: AnimalMarkerProps) {
  if (!position.visible) return null

  const offset = getScreenOffset(position.relativeBearing, fieldOfView, screenWidth)
  const scale = getDistanceScale(position.distance, DISCOVERY_RADIUS)

  return (
    <div
      className="animal-marker"
      style={{
        transform: `translateX(${offset}px) scale(${scale})`,
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={animal.name}
    >
      <img src={animal.image} alt={animal.name} className="marker-image" />
      <div className="marker-label">{animal.name}</div>
    </div>
  )
}
