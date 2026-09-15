import { Animal3D } from '../Animal/Animal3D'
import type { Animal, AnimalPosition } from '../../types/animal'
import { DISCOVERY_RADIUS, getDistanceScale, getScreenOffset, getVerticalScreenOffset } from '../../lib/animal-position'

interface SensorArFallbackProps {
  items: Array<{ animal: Animal; position: AnimalPosition }>
  screenWidth: number
  screenHeight: number
  fieldOfView: number
  verticalFieldOfView: number
  onSelect: (animal: Animal) => void
}

export function SensorArFallback({
  items,
  screenWidth,
  screenHeight,
  fieldOfView,
  verticalFieldOfView,
  onSelect,
}: SensorArFallbackProps) {
  return (
    <div className="sensor-ar-fallback" aria-label="Kamera ve sensör 3D keşif alanı">
      <div className="sensor-ar-fallback-world">
        {items.map(({ animal, position }) => {
          if (!position.visible) return null

          const offsetX = getScreenOffset(position.relativeBearing, fieldOfView, screenWidth)
          const offsetY = getVerticalScreenOffset(position.verticalAngle, verticalFieldOfView, screenHeight)
          const scale = getDistanceScale(position.distance, DISCOVERY_RADIUS)
          const depth = Math.max(-420, Math.min(90, 90 - position.distance * 0.42))
          const modelSize = Math.max(72, Math.min(128, 88 * scale))

          return (
            <button
              key={animal.id}
              type="button"
              className="sensor-ar-animal"
              style={{
                transform: `translate3d(${offsetX}px, ${offsetY}px, ${depth}px) scale(${scale})`,
              }}
              onClick={() => onSelect(animal)}
              aria-label={`${animal.name}, ${Math.round(position.distance)} metre, ${Math.round(position.bearing)} derece`}
            >
              <span className="sensor-ar-animal-model" aria-hidden="true">
                <Animal3D rarity={animal.rarity} size={modelSize} />
              </span>
              <span className="sensor-ar-animal-label">{animal.name}</span>
              <span className="sensor-ar-animal-distance">{Math.round(position.distance)} m</span>
            </button>
          )
        })}
      </div>
      <div className="sensor-ar-reticle" aria-hidden="true">＋</div>
    </div>
  )
}
