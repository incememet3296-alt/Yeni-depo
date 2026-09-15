export type ArSupportStatus =
  | 'checking'
  | 'supported'
  | 'unsupported'
  | 'permission-required'

export interface ArSupportResult {
  status: ArSupportStatus
  hasCamera: boolean
  hasGps: boolean
  hasOrientation: boolean
  hasHttps: boolean
  reasons: string[]
}

export function checkArSupport(): ArSupportResult {
  const reasons: string[] = []

  const hasCamera = !!(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  )
  const hasGps = 'geolocation' in navigator
  const hasOrientation = 'DeviceOrientationEvent' in window
  const hasHttps =
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'

  if (!hasCamera) reasons.push('Kamera API desteklenmiyor')
  if (!hasGps) reasons.push('GPS desteklenmiyor')
  if (!hasOrientation) reasons.push('Cihaz yönelimi desteklenmiyor')
  if (!hasHttps) reasons.push('HTTPS gerekli (localhost hariç)')

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const permissionRequired =
    isIOS &&
    typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission === 'function'

  if (reasons.length > 0) {
    return { status: 'unsupported', hasCamera, hasGps, hasOrientation, hasHttps, reasons }
  }

  if (permissionRequired) {
    return { status: 'permission-required', hasCamera, hasGps, hasOrientation, hasHttps, reasons }
  }

  return { status: 'supported', hasCamera, hasGps, hasOrientation, hasHttps, reasons }
}
