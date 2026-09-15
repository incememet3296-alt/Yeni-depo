export type CameraStatus =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'permission-denied'
  | 'unsupported'
  | 'https-required'
  | 'error'

export interface CameraState {
  status: CameraStatus
  stream: MediaStream | null
  error: string | null
}

export function isCameraSupported(): boolean {
  return !!(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  )
}

export function isHttps(): boolean {
  return (
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  )
}

export async function startCamera(): Promise<CameraState> {
  if (!isHttps()) {
    return {
      status: 'https-required',
      stream: null,
      error: 'Kamera için HTTPS gerekli. Localhost dışında HTTPS bağlantısı zorunludur.',
    }
  }

  if (!isCameraSupported()) {
    return {
      status: 'unsupported',
      stream: null,
      error: 'Bu cihaz/tarayıcı kamera API desteklemiyor.',
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    return { status: 'ready', stream, error: null }
  } catch (err) {
    const error = err as DOMException
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return {
        status: 'permission-denied',
        stream: null,
        error: 'Kamera izni reddedildi. Tarayıcı ayarlarından izin verin.',
      }
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return {
        status: 'unsupported',
        stream: null,
        error: 'Kamera bulunamadı.',
      }
    }
    return {
      status: 'error',
      stream: null,
      error: error.message || 'Kamera başlatılamadı.',
    }
  }
}

export function stopCamera(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
  }
}
