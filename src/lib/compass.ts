import type { OrientationData } from './orientation'

/**
 * Alpha değerinden pusula yönünü (heading) hesaplar.
 * iOS ve Android farklılık gösterir:
 * - Android: alpha zaten pusula yönüne yakındır (webkitCompassHeading varsa onu kullan)
 * - iOS: webkitCompassHeading kullanılır (alpha ters çalışır)
 *
 * 0 = Kuzey, 90 = Doğu, 180 = Güney, 270 = Batı
 */
export function getHeading(
  orientation: OrientationData | null,
  compassHeading?: number | null,
): number | null {
  if (compassHeading != null && !isNaN(compassHeading)) {
    return compassHeading
  }

  if (orientation && orientation.alpha != null && !isNaN(orientation.alpha)) {
    return 360 - orientation.alpha
  }

  return null
}

/**
 * Yön derecesine göre pusula etiketi döndürür.
 */
export function getCompassLabel(heading: number): string {
  const directions = [
    'K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB',
  'K',
  ]

  const index = Math.round(heading / 45) % 8
  return directions[index]
}
