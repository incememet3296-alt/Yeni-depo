import type { OrientationData } from './orientation'

export function normalizeHeading(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function getScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0
  const angle = window.screen.orientation?.angle
  if (typeof angle === 'number' && Number.isFinite(angle)) return angle
  const legacyAngle = (window as Window & { orientation?: number }).orientation
  return typeof legacyAngle === 'number' && Number.isFinite(legacyAngle) ? legacyAngle : 0
}

/**
 * Returns a clockwise heading: 0 = north, 90 = east, 180 = south, 270 = west.
 * iOS exposes webkitCompassHeading; Android browsers generally provide alpha.
 */
export function getHeading(
  orientation: OrientationData | null,
  locationHeading?: number | null,
): number | null {
  if (orientation?.compassHeading != null) {
    return normalizeHeading(orientation.compassHeading)
  }

  if (locationHeading != null && Number.isFinite(locationHeading)) {
    return normalizeHeading(locationHeading)
  }

  if (orientation?.alpha != null && Number.isFinite(orientation.alpha)) {
    // DeviceOrientation alpha is relative to the device's screen. Compensate
    // for portrait/landscape rotation so the camera center remains aligned
    // with geographic north when the user rotates the phone orientation.
    return normalizeHeading(360 - orientation.alpha - getScreenOrientationAngle())
  }

  return null
}

export function getCompassLabel(heading: number): string {
  const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB']
  return directions[Math.round(normalizeHeading(heading) / 45) % 8]
}
