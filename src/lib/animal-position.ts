import type { Animal, AnimalPosition, UserLocation } from '../types/animal'
import { toLocalWorldPosition } from './world-position'

export const DISCOVERY_RADIUS = 10000

function offsetCoordinate(latitude: number, longitude: number, distanceMeters: number, bearingDegrees: number) {
  const earthRadius = 6371000
  const bearing = bearingDegrees * Math.PI / 180
  const lat = latitude * Math.PI / 180
  const lon = longitude * Math.PI / 180
  const angularDistance = distanceMeters / earthRadius
  const targetLat = Math.asin(Math.sin(lat) * Math.cos(angularDistance) + Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing))
  const targetLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat), Math.cos(angularDistance) - Math.sin(lat) * Math.sin(targetLat))
  return { latitude: targetLat * 180 / Math.PI, longitude: targetLon * 180 / Math.PI }
}

/**
 * Returns the user's pet position relative to the user's live phone location.
 * The bearing used for the side offset is supplied separately from the live
 * compass heading. This is important: rotating the phone must NOT rotate the
 * pet around the user or pin it to a fixed screen position.
 */
export function getFollowingPetLocation(user: UserLocation, animal: Animal, anchorHeading: number) {
  if (!animal.isOwned) return { latitude: animal.latitude, longitude: animal.longitude, altitude: animal.altitude }
  const sideBearing = (anchorHeading + 90 + 360) % 360
  const point = offsetCoordinate(user.latitude, user.longitude, Math.max(0.8, animal.followDistanceM), sideBearing)
  return { latitude: point.latitude, longitude: point.longitude, altitude: (user.altitude ?? animal.altitude) + 0.05 }
}

export function calculateAnimalPosition(animal: Animal, user: UserLocation, heading: number, anchorHeading = heading): AnimalPosition {
  const petLocation = getFollowingPetLocation(user, animal, anchorHeading)
  const world = toLocalWorldPosition(
    { latitude: user.latitude, longitude: user.longitude, altitude: user.altitude },
    petLocation,
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

export function getScreenOffset(relativeBearing: number, fieldOfView: number, screenWidth: number): number {
  const maxOffset = screenWidth / 2
  const ratio = relativeBearing / (fieldOfView / 2)
  return Math.max(-1, Math.min(1, ratio)) * maxOffset
}

export function getVerticalScreenOffset(verticalAngle: number, verticalFieldOfView: number, screenHeight: number): number {
  const maxOffset = screenHeight / 2
  const ratio = verticalAngle / (verticalFieldOfView / 2)
  return -Math.max(-1, Math.min(1, ratio)) * maxOffset
}

export function getDistanceScale(distance: number, maxDistance: number): number {
  if (distance <= 0) return 1
  const ratio = 1 - Math.min(distance / maxDistance, 1)
  return 0.3 + ratio * 0.7
}
