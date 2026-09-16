import type { Animal, AnimalPosition } from '../../types/animal'
import { getScreenOffset, getVerticalScreenOffset, getDistanceScale, DISCOVERY_RADIUS } from '../../lib/animal-position'
import { Animal3D } from './Animal3D'

interface AnimalMarkerProps {
  animal: Animal
  position: AnimalPosition
  screenWidth: number
  screenHeight: number
  fieldOfView: number
  verticalFieldOfView: number
  onSelect: () => void
}

const ANIMAL_ICONS: Record<string, string> = {
  'cat-01': '🐱',
  'dog-01': '🐶',
  'rabbit-01': '🐰',
  'fox-01': '🦊',
  'bird-01': '🐦',
}

export function AnimalMarker({
  animal,
  position,
  screenWidth,
  screenHeight,
  fieldOfView,
  verticalFieldOfView,
  onSelect,
}: AnimalMarkerProps) {
  if (!position.visible) return null

  const offsetX = getScreenOffset(position.relativeBearing, fieldOfView, screenWidth)
  const offsetY = getVerticalScreenOffset(position.verticalAngle, verticalFieldOfView, screenHeight)
  const scale = getDistanceScale(position.distance, DISCOVERY_RADIUS)
  const modelSize = Math.max(88, Math.min(150, 104 * Math.max(scale, 0.9)))
  const icon = ANIMAL_ICONS[animal.id] ?? '🐾'

  return (
    <div
      className="animal-marker"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${Math.max(scale, 0.9)})`,
      }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect()
      }}
      role="button"
      tabIndex={0}
      aria-label={`${animal.name}, ${Math.round(position.distance)} metre`}
    >
      <div className="animal-3d-shell" aria-hidden="true">
        <div className="animal-visual-fallback" aria-hidden="true">{icon}</div>
        <Animal3D rarity={animal.rarity} size={modelSize} />
      </div>
      <div className="marker-label">{animal.name}</div>
    </div>
  )
}
