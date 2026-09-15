import { useEffect, useRef } from 'react'
import type { CameraState } from '../../lib/camera'

interface CameraViewProps {
  state: CameraState
}

export function CameraView({ state }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && state.stream) {
      videoRef.current.srcObject = state.stream
      videoRef.current.play().catch(() => {})
    }
  }, [state.stream])

  return (
    <div className="camera-view">
      {state.status === 'ready' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
      )}
      {state.status === 'starting' && (
        <div className="camera-placeholder">
          <div className="camera-spinner" />
          <p>Kamera başlatılıyor...</p>
        </div>
      )}
      {state.status === 'idle' && (
        <div className="camera-placeholder">
          <p>Kamera kapalı</p>
        </div>
      )}
    </div>
  )
}
