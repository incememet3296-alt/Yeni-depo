import type { Animal, AnimalPosition, UserLocation } from '../types/animal'
import { calculateDistance } from './distance'
import { calculateBearing } from './bearing'

export const DISCOVERY_RADIUS = 1000 // metre

/**
 * Kullanıcının konumuna ve yönüne göre her hayvanın ekran pozisyonunu hesaplar.
 * - distance: kullanıcıdan hayvana olan mesafe (metre)
 * - bearing: hayvanın mutlak yönü (kuzeye göre derece)
 * - relativeBearing: kullanıcının heading'ine göre hayvanın göreceli yönü
 *   (0 = kullanıcı tam önüne bakıyor, negatif = sol, pozitif = sağ)
 * - visible: hayvan keşif yarıçapı içinde mi
 */
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

  const visible = distance <= DISCOVERY_RADIUS

  return {
    id: animal.id,
    distance,
    bearing,
    relativeBearing,
    visible,
  }
}

/**
 * Açıyı -180 ile 180 arasına normalize eder.
 */
export function normalizeAngle(angle: number): number {
  let result = angle % 360
  if (result > 180) result -= 360
  if (result < -180) result += 360
  return result
}

/**
 * Hayvanın ekran üzerindeki X pozisyonunu (piksel) hesaplar.
 * relativeBearing'a göre ekranda yatay ofset verir.
 * -90 (sol) → negatif ofset, 0 (ön) → merkez, 90 (sağ) → pozitif ofset
 */
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

/**
 * Mesafeye göre hayvanın ekran boyutunu (scale) hesaplar.
 * Yakın hayvanlar büyük, uzak hayvanlar küçük görünür.
 */
export function getDistanceScale(distance: number, maxDistance: number): number {
  if (distance <= 0) return 1
  const ratio = 1 - Math.min(distance / maxDistance, 1)
  return 0.3 + ratio * 0.7
}
