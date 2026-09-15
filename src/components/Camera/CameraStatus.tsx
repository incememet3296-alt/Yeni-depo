import type { CameraState } from '../../lib/camera'

interface CameraStatusProps {
  state: CameraState
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Kamera kapalı',
  starting: 'Kamera başlatılıyor',
  ready: 'Kamera hazır',
  'permission-denied': 'Kamera izni reddedildi',
  unsupported: 'Kamera desteklenmiyor',
  'https-required': 'HTTPS gerekli',
  error: 'Kamera kullanılamıyor',
}

export function CameraStatus({ state }: CameraStatusProps) {
  const label = STATUS_LABELS[state.status] || state.status
  const isError = [
    'permission-denied',
    'unsupported',
    'https-required',
    'error',
  ].includes(state.status)

  return (
    <div className={`camera-status-badge ${isError ? 'badge-error' : 'badge-ok'}`}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  )
}
