import { useCallback, useEffect, useState } from 'react'
import {
  startOrientation,
  requestOrientationPermission,
  isOrientationPermissionRequired,
  isOrientationSupported,
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
  const [state, setState] = useState<Omit<OrientationHookState, 'requestPermission'>>({
    status: 'idle',
    data: null,
    error: null,
  })

  const beginListening = useCallback(() => {
    if (!isOrientationSupported()) {
      setState((prev) => ({
        ...prev,
        status: 'unsupported',
        error: 'Bu cihaz/tarayıcı cihaz yönelim sensörünü desteklemiyor.',
      }))
      return () => {}
    }

    const cleanup = startOrientation((data) => {
      setState({ status: 'active', data, error: null })
    })
    return cleanup
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isOrientationSupported()) {
      setState((prev) => ({
        ...prev,
        status: 'unsupported',
        error: 'Bu cihaz/tarayıcı cihaz yönelim sensörünü desteklemiyor.',
      }))
      return false
    }

    if (isOrientationPermissionRequired()) {
      const granted = await requestOrientationPermission()
      if (!granted) {
        setState((prev) => ({
          ...prev,
          status: 'permission-denied',
          error: 'Pusula/yön sensörü izni reddedildi.',
        }))
        return false
      }
    }

    setState((prev) => ({ ...prev, status: 'active', error: null }))
    return true
  }, [])

  useEffect(() => {
    if (!isOrientationSupported()) {
      setState((prev) => ({
        ...prev,
        status: 'unsupported',
        error: 'Bu cihaz/tarayıcı cihaz yönelim sensörünü desteklemiyor.',
      }))
      return
    }

    if (!isOrientationPermissionRequired()) {
      return beginListening()
    }
    return () => {}
  }, [beginListening])

  useEffect(() => {
    if (state.status === 'active' && !state.data) {
      return beginListening()
    }
    return () => {}
  }, [state.status, state.data, beginListening])

  return { ...state, requestPermission }
}
