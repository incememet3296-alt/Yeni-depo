import type { Animal, AnimalPosition, UserLocation } from '../types/animal'
import { toLocalWorldPosition } from './world-position'

export const DISCOVERY_RADIUS = 1000

export function calculateAnimalPosition(
  animal: Animal,
  user: UserLocation,
  heading: number,
): AnimalPosition {
  const world = toLocalWorldPosition(
    {
      latitude: user.latitude,
      longitude: user.longitude,
      altitude: user.altitude,
    },
    {
      latitude: animal.latitude,
      longitude: animal.longitude,
      altitude: animal.altitude,
    },
  )

  const relativeBearing = normalizeAngle(world.bearing - heading)

  return {
    id: animal.id,
    distance: world.distance,
    bearing: world.bearing,
    relativeBearing,
    verticalAngle: world.elevation,
    visible: world.distance <= DISCOVERY_RADIUS,
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
  return Math.max(-1, Math.min(1, ratio)) * maxOffset
}

export function getVerticalScreenOffset(
  verticalAngle: number,
  verticalFieldOfView: number,
  screenHeight: number,
): number {
  const maxOffset = screenHeight / 2
  const ratio = verticalAngle / (verticalFieldOfView / 2)
  return -Math.max(-1, Math.min(1, ratio)) * maxOffset
}

export function getDistanceScale(distance: number, maxDistance: number): number {
  if (distance <= 0) return 1
  const ratio = 1 - Math.min(distance / maxDistance, 1)
  return 0.3 + ratio * 0.7
}
