import type { Animal, AnimalPosition, UserLocation } from '../types/animal'
import { calculateDistance } from './distance'
import { calculateBearing } from './bearing'

export const DISCOVERY_RADIUS = 1000

export function calculateAnimalPosition(
  animal: Animal,
  user: UserLocation,
  heading: number,
): AnimalPosition {
  const distance = calculateDistance(
    user.latitude,
    user.longitude,
    animal.latitude,
    animal.longitude,
  )

  const bearing = calculateBearing(
    user.latitude,
    user.longitude,
    animal.latitude,
    animal.longitude,
  )

  const relativeBearing = normalizeAngle(bearing - heading)
  const userAltitude = user.altitude ?? 0
  const verticalAngle = Math.atan2(animal.altitude - userAltitude, Math.max(distance, 1)) * (180 / Math.PI)

  return {
    id: animal.id,
    distance,
    bearing,
    relativeBearing,
    verticalAngle,
    visible: distance <= DISCOVERY_RADIUS,
  }
}

export function normalizeAngle(angle: number): number {
  let result = angle % 360
  if (result > 180) result -= 360
  if (result < -180) result += 360
  return result
}

export function getScreenOffset(
  relativeBearing: number,
  fieldOfView: number,
  screenWidth: number,
): number {
  const maxOffset = screenWidth / 2
  const ratio = relativeBearing / (fieldOfView / 2)
  const clamped = Math.max(-1, Math.min(1, ratio))
  return clamped * maxOffset
}

export function getVerticalScreenOffset(
  verticalAngle: number,
  verticalFieldOfView: number,
  screenHeight: number,
): number {
  const maxOffset = screenHeight / 2
  const ratio = verticalAngle / (verticalFieldOfView / 2)
  const clamped = Math.max(-1, Math.min(1, ratio))
  return -clamped * maxOffset
}

export function getDistanceScale(distance: number, maxDistance: number): number {
  if (distance <= 0) return 1
  const ratio = 1 - Math.min(distance / maxDistance, 1)
  return 0.3 + ratio * 0.7
}
