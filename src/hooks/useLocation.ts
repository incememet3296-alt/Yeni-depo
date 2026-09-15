import { useEffect, useState } from 'react'
import {
  watchLocation,
  type LocationData,
  type LocationStatus,
} from '../lib/location'

interface LocationHookState {
  status: LocationStatus
  data: LocationData | null
  error: string | null
}

export function useLocation() {
  const [state, setState] = useState<LocationHookState>({
    status: 'idle',
    data: null,
    error: null,
  })

  useEffect(() => {
    const cleanup = watchLocation(
      (data) => {
        setState({ status: 'watching', data, error: null })
      },
      (error) => {
        setState((prev) => {
          if (error.includes('reddedildi')) {
            return { ...prev, status: 'permission-denied' as LocationStatus, error }
          }
          return { ...prev, status: 'error' as LocationStatus, error }
        })
      },
    )

    return cleanup
  }, [])

  return state
}
