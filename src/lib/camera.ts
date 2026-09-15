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
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export function isHttps(): boolean {
  return (
    typeof location !== 'undefined' &&
    (location.protocol === 'https:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1')
  )
}

async function requestCamera(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(constraints)
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

  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: true, audio: false },
  ]

  let lastError: unknown = null
  for (const constraints of attempts) {
    try {
      const stream = await requestCamera(constraints)
      return { status: 'ready', stream, error: null }
    } catch (err) {
      lastError = err
      const error = err as DOMException
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          status: 'permission-denied',
          stream: null,
          error: 'Kamera izni reddedildi. Tarayıcı ayarlarından kamera iznini verin.',
        }
      }
      if (error.name === 'SecurityError') {
        return {
          status: 'https-required',
          stream: null,
          error: 'Tarayıcı güvenlik nedeniyle kameraya erişemedi. HTTPS bağlantısını kontrol edin.',
        }
      }
    }
  }

  const error = lastError as DOMException | null
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return {
      status: 'unsupported',
      stream: null,
      error: 'Kamera bulunamadı.',
    }
  }

  return {
    status: 'error',
    stream: null,
    error: error?.message || 'Kamera başlatılamadı.',
  }
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}
