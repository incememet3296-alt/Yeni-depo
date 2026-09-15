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
  return 'geolocation' in navigator
}

/**
 * GPS watchPosition başlatır. Callback her güncellemede çağrılır.
 * Cleanup fonksiyonu döner - component unmount'ta çağrılmalı.
 */
export function watchLocation(
  onUpdate: (data: LocationData) => void,
  onError: (error: string) => void,
): () => void {
  if (!isLocationSupported()) {
    onError('Bu cihaz GPS desteklemiyor.')
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        heading: pos.coords.heading,
      })
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        onError('Konum izni reddedildi.')
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        onError('Konum bilgisi kullanılamıyor.')
      } else {
        onError(err.message || 'Konum hatası.')
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    },
  )

  return () => navigator.geolocation.clearWatch(watchId)
}
