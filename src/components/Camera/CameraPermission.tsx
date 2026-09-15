import { Button } from '../UI/Button'

interface CameraPermissionProps {
  onRequest: () => void
}

export function CameraPermission({ onRequest }: CameraPermissionProps) {
  return (
    <div className="camera-permission">
      <div className="permission-icon" aria-hidden="true">📷</div>
      <h2>Kamera İzni Gerekli</h2>
      <p>
        Sanal hayvanları gerçek dünyada görebilmek için kamera erişimine izin verin.
      </p>
      <Button onClick={onRequest}>Kamerayı Aç</Button>
    </div>
  )
}
