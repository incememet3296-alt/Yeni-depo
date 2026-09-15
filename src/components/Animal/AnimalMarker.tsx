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
  const modelSize = Math.max(72, Math.min(128, 88 * scale))

  return (
    <div
      className="animal-marker"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
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
        <Animal3D rarity={animal.rarity} size={modelSize} />
      </div>
      <div className="marker-label">{animal.name}</div>
    </div>
  )
}
