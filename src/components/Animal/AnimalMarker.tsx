import type { Animal, AnimalPosition } from '../../types/animal'
import { getScreenOffset, getVerticalScreenOffset, getDistanceScale, DISCOVERY_RADIUS } from '../../lib/animal-position'

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
      <img src={animal.image} alt={animal.name} className="marker-image" />
      <div className="marker-label">{animal.name}</div>
    </div>
  )
}
