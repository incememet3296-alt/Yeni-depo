export interface WebXRArSupport {
  available: boolean
  immersiveAr: boolean
  reason?: string
}

export async function checkWebXRArSupport(): Promise<WebXRArSupport> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { available: false, immersiveAr: false, reason: 'Tarayıcı ortamı yok' }
  }

  if (!navigator.xr) {
    return { available: false, immersiveAr: false, reason: 'WebXR API desteklenmiyor' }
  }

  try {
    const immersiveAr = await navigator.xr.isSessionSupported('immersive-ar')
    return immersiveAr
      ? { available: true, immersiveAr: true }
      : { available: true, immersiveAr: false, reason: 'immersive-ar desteklenmiyor' }
  } catch {
    return { available: true, immersiveAr: false, reason: 'WebXR yeteneği doğrulanamadı' }
  }
}

export async function startImmersiveAr(): Promise<XRSession | null> {
  const support = await checkWebXRArSupport()
  if (!support.immersiveAr || !navigator.xr) return null

  try {
    return await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['dom-overlay'],
    })
  } catch {
    return null
  }
}
