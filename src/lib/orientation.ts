export interface OrientationData {
  alpha: number | null
  beta: number | null
  gamma: number | null
  compassHeading: number | null
  absolute: boolean
}

export type OrientationStatus =
  | 'idle'
  | 'active'
  | 'permission-required'
  | 'permission-denied'
  | 'unsupported'

interface DeviceOrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

export function isOrientationSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

export function isOrientationPermissionRequired(): boolean {
  if (!isOrientationSupported()) return false
  const evt = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>
  }
  return typeof evt.requestPermission === 'function'
}

export async function requestOrientationPermission(): Promise<boolean> {
  if (!isOrientationSupported()) return false

  const evt = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>
  }
  if (typeof evt.requestPermission === 'function') {
    try {
      return (await evt.requestPermission()) === 'granted'
    } catch {
      return false
    }
  }
  return true
}

export function startOrientation(
  onUpdate: (data: OrientationData) => void,
): () => void {
  if (!isOrientationSupported()) return () => {}

  const handler = (event: Event) => {
    const e = event as DeviceOrientationEventWithCompass
    const compassHeading =
      typeof e.webkitCompassHeading === 'number' && Number.isFinite(e.webkitCompassHeading)
        ? e.webkitCompassHeading
        : null

    onUpdate({
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma,
      compassHeading,
      absolute: e.absolute,
    })
  }

  window.addEventListener('deviceorientation', handler, true)
  return () => window.removeEventListener('deviceorientation', handler, true)
}
