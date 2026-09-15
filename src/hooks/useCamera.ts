import { useCallback, useEffect, useRef, useState } from 'react'
import {
  startCamera,
  stopCamera,
  type CameraState,
  type CameraStatus,
} from '../lib/camera'

const initialState: CameraState = {
  status: 'idle',
  stream: null,
  error: null,
}

export function useCamera() {
  const [state, setState] = useState<CameraState>(initialState)
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'starting' as CameraStatus }))
    const result = await startCamera()
    streamRef.current = result.stream
    setState(result)
  }, [])

  const stop = useCallback(() => {
    stopCamera(streamRef.current)
    streamRef.current = null
    setState(initialState)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera(streamRef.current)
    }
  }, [])

  return { state, start, stop }
}
