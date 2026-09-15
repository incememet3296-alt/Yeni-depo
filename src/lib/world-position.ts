export interface GeoPoint {
  latitude: number
  longitude: number
  altitude: number | null
}

export interface LocalWorldPosition {
  east: number
  north: number
  up: number
  distance: number
  bearing: number
  elevation: number
}

const EARTH_RADIUS = 6371000
const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

function normalizeAngle(angle: number): number {
  const value = angle % 360
  return value < 0 ? value + 360 : value
}

/**
 * Converts a GPS point to a local East/North/Up coordinate system around the user.
 * This keeps the AR math stable over the small distances used by the game.
 */
export function toLocalWorldPosition(origin: GeoPoint, target: GeoPoint): LocalWorldPosition {
  const lat1 = origin.latitude * DEG_TO_RAD
  const lat2 = target.latitude * DEG_TO_RAD
  const dLat = (target.latitude - origin.latitude) * DEG_TO_RAD
  const dLon = (target.longitude - origin.longitude) * DEG_TO_RAD
  const meanLat = (lat1 + lat2) / 2

  const north = dLat * EARTH_RADIUS
  const east = dLon * EARTH_RADIUS * Math.cos(meanLat)
  const up = (target.altitude ?? 0) - (origin.altitude ?? 0)
  const horizontalDistance = Math.hypot(east, north)
  const distance = Math.hypot(horizontalDistance, up)
  const bearing = normalizeAngle(Math.atan2(east, north) * RAD_TO_DEG)
  const elevation = Math.atan2(up, Math.max(horizontalDistance, 0.001)) * RAD_TO_DEG

  return { east, north, up, distance, bearing, elevation }
}

export function projectToCamera(
  position: LocalWorldPosition,
  heading: number,
  pitch: number,
  horizontalFov: number,
  verticalFov: number,
  width: number,
  height: number,
) {
  const relativeBearing = ((position.bearing - heading + 540) % 360) - 180
  const relativeElevation = position.elevation - pitch
  const x = Math.max(-1, Math.min(1, relativeBearing / (horizontalFov / 2))) * (width / 2)
  const y = -Math.max(-1, Math.min(1, relativeElevation / (verticalFov / 2))) * (height / 2)

  return { x, y, relativeBearing, relativeElevation }
}
