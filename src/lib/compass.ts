import type { OrientationData } from './orientation'

export function normalizeHeading(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
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
    // DeviceOrientation alpha is clockwise around the z-axis. For browsers
    // without a calibrated compass value, this is the best available fallback.
    return normalizeHeading(360 - orientation.alpha)
  }

  return null
}

export function getCompassLabel(heading: number): string {
  const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB']
  return directions[Math.round(normalizeHeading(heading) / 45) % 8]
}
