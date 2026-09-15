export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  heading: number | null
}

export type LocationStatus =
  | 'idle'
  | 'watching'
  | 'permission-denied'
  | 'unavailable'
  | 'error'

export interface LocationState {
  status: LocationStatus
  data: LocationData | null
  error: string | null
}

export function isLocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

export function isSecureLocationContext(): boolean {
  return (
    typeof location !== 'undefined' &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  )
}

export function watchLocation(
  onUpdate: (data: LocationData) => void,
  onError: (error: string) => void,
): () => void {
  if (!isLocationSupported()) {
    onError('Bu cihaz konum API desteklemiyor.')
    return () => {}
  }

  if (!isSecureLocationContext()) {
    onError('Konum için HTTPS bağlantısı gerekli.')
    return () => {}
  }

  let primaryWatchId: number | null = null
  let fallbackWatchId: number | null = null
  let fallbackStarted = false

  const handleUpdate = (pos: GeolocationPosition) => {
    onUpdate({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      heading: pos.coords.heading,
    })
  }

  const handleError = (err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      onError('Konum izni reddedildi.')
      return
    }

    if (!fallbackStarted && (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT)) {
      fallbackStarted = true
      fallbackWatchId = navigator.geolocation.watchPosition(
        handleUpdate,
        (fallbackError) => {
          if (fallbackError.code === fallbackError.PERMISSION_DENIED) {
            onError('Konum izni reddedildi.')
          } else {
            onError(fallbackError.message || 'Konum bilgisi kullanılamıyor.')
          }
        },
        {
          enableHighAccuracy: false,
          maximumAge: 10000,
          timeout: 30000,
        },
      )
      return
    }

    onError(err.message || 'Konum hatası.')
  }

  primaryWatchId = navigator.geolocation.watchPosition(
    handleUpdate,
    handleError,
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    },
  )

  return () => {
    if (primaryWatchId != null) navigator.geolocation.clearWatch(primaryWatchId)
    if (fallbackWatchId != null) navigator.geolocation.clearWatch(fallbackWatchId)
  }
}
