export type ArSupportStatus =
  | 'full'
  | 'sensor'
  | 'gps-camera'
  | 'location-only'
  | 'unsupported'
  | 'permission-required'

export interface ArSupportResult {
  status: ArSupportStatus
  hasCamera: boolean
  hasGps: boolean
  hasOrientation: boolean
  hasHttps: boolean
  isIOS: boolean
  isAndroid: boolean
  reasons: string[]
}

export function checkArSupport(): ArSupportResult {
  const reasons: string[] = []
  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const hasGps = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const hasOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  const hasHttps =
    typeof location !== 'undefined' &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)

  if (!hasCamera) reasons.push('Kamera API desteklenmiyor')
  if (!hasGps) reasons.push('GPS desteklenmiyor')
  if (!hasOrientation) reasons.push('Cihaz yönelimi desteklenmiyor')
  if (!hasHttps) reasons.push('HTTPS gerekli (localhost hariç)')

  const permissionRequired =
    hasOrientation &&
    typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'

  if (permissionRequired) {
    return { status: 'permission-required', hasCamera, hasGps, hasOrientation, hasHttps, isIOS, isAndroid, reasons }
  }

  if (hasCamera && hasGps && hasOrientation && hasHttps) {
    return { status: 'full', hasCamera, hasGps, hasOrientation, hasHttps, isIOS, isAndroid, reasons }
  }

  if (hasCamera && hasGps && hasHttps) {
    return { status: 'sensor', hasCamera, hasGps, hasOrientation, hasHttps, isIOS, isAndroid, reasons }
  }

  if (hasCamera && hasGps) {
    return { status: 'gps-camera', hasCamera, hasGps, hasOrientation, hasHttps, isIOS, isAndroid, reasons }
  }

  if (hasGps) {
    return { status: 'location-only', hasCamera, hasGps, hasOrientation, hasHttps, isIOS, isAndroid, reasons }
  }

  return { status: 'unsupported', hasCamera, hasGps, hasOrientation, hasHttps, isIOS, isAndroid, reasons }
}
