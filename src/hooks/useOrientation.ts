import { useCallback, useEffect, useState } from 'react'
import {
  startOrientation,
  requestOrientationPermission,
  isOrientationPermissionRequired,
  type OrientationData,
  type OrientationStatus,
} from '../lib/orientation'

interface OrientationHookState {
  status: OrientationStatus
  data: OrientationData | null
  error: string | null
  requestPermission: () => Promise<boolean>
}

export function useOrientation(): OrientationHookState {
  const [state, setState] = useState<Omit<OrientationHookState, 'requestPermission'>>(
    {
      status: 'idle',
      data: null,
      error: null,
    },
  )

  const beginListening = useCallback(() => {
    const cleanup = startOrientation((data) => {
      setState((prev) => ({ ...prev, status: 'active', data, error: null }))
    })
    return cleanup
  }, [])

  const requestPermission = useCallback(async () => {
    if (isOrientationPermissionRequired()) {
      const granted = await requestOrientationPermission()
      if (!granted) {
        setState((prev) => ({
          ...prev,
          status: 'permission-denied' as OrientationStatus,
          error: 'Pusula izni reddedildi.',
        }))
        return false
      }
    }

    setState((prev) => ({ ...prev, status: 'active' as OrientationStatus }))
    return true
  }, [])

  useEffect(() => {
    if (!isOrientationPermissionRequired()) {
      const cleanup = beginListening()
      return cleanup
    }
    return () => {}
  }, [beginListening])

  useEffect(() => {
    if (state.status === 'active' && !state.data) {
      const cleanup = beginListening()
      return cleanup
    }
    return () => {}
  }, [state.status, state.data, beginListening])

  return { ...state, requestPermission }
}
