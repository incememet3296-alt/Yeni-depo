export interface OrientationData {
  alpha: number | null // pusula yönü (0-360)
  beta: number | null // ön-arka eğim (-180 to 180)
  gamma: number | null // sol-sağ eğim (-90 to 90)
}

export type OrientationStatus =
  | 'idle'
  | 'active'
  | 'permission-required'
  | 'permission-denied'
  | 'unsupported'

export interface OrientationState {
  status: OrientationStatus
  data: OrientationData | null
  error: string | null
}

export function isOrientationSupported(): boolean {
  return 'DeviceOrientationEvent' in window
}

export function isOrientationPermissionRequired(): boolean {
  return (
    typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission === 'function'
  )
}

export async function requestOrientationPermission(): Promise<boolean> {
  const evt = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>
  }
  if (typeof evt.requestPermission === 'function') {
    try {
      const result = await evt.requestPermission()
      return result === 'granted'
    } catch {
      return false
    }
  }
  return true
}

/**
 * DeviceOrientation listener başlatır. Callback her orientation değişiminde çağrılır.
 * Cleanup fonksiyonu döner.
 */
export function startOrientation(
  onUpdate: (data: OrientationData) => void,
): () => void {
  const handler = (e: DeviceOrientationEvent) => {
    onUpdate({
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma,
    })
  }

  window.addEventListener('deviceorientation', handler, true)
  return () => window.removeEventListener('deviceorientation', handler, true)
}
