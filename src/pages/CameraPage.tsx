import { useState, useMemo, useEffect, useRef } from 'react'
import { Header } from '../components/Layout/Header'
import { CameraView } from '../components/Camera/CameraView'
import { CameraPermission } from '../components/Camera/CameraPermission'
import { CameraStatus } from '../components/Camera/CameraStatus'
import { AnimalMarker } from '../components/Animal/AnimalMarker'
import { AnimalInfo } from '../components/Animal/AnimalInfo'
import { StatusMessage } from '../components/UI/StatusMessage'
import { Button } from '../components/UI/Button'
import { useCamera } from '../hooks/useCamera'
import { useLocation } from '../hooks/useLocation'
import { useOrientation } from '../hooks/useOrientation'
import { useArSupport } from '../hooks/useArSupport'
import { getHeading } from '../lib/compass'
import { calculateAnimalPosition } from '../lib/animal-position'
import { calculateDistance } from '../lib/distance'
import { startWebXRAnimalSession } from '../lib/webxr-ar'
import { ANIMALS } from '../data/animals'
import type { Animal } from '../types/animal'
import '../styles/ar-3d.css'

const FIELD_OF_VIEW = 60
const VERTICAL_FIELD_OF_VIEW = 45

type WebXRSession = Awaited<ReturnType<typeof startWebXRAnimalSession>>

interface CameraPageProps {
  onNavigate: (path: string) => void
}

export function CameraPage({ onNavigate }: CameraPageProps) {
  const camera = useCamera()
  const location = useLocation()
  const orientation = useOrientation()
  const arSupport = useArSupport()
  const [selected, setSelected] = useState<Animal | null>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [fallbackMode, setFallbackMode] = useState(false)
  const [xrStarting, setXrStarting] = useState(false)
  const [xrActive, setXrActive] = useState(false)
  const [xrUnavailable, setXrUnavailable] = useState(false)
  const xrSessionRef = useRef<WebXRSession>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  useEffect(() => {
    return () => {
      void xrSessionRef.current?.end()
      xrSessionRef.current = null
    }
  }, [])

  const heading = useMemo(() => {
    return getHeading(orientation.data, location.data?.heading)
  }, [orientation.data, location.data?.heading])

  const animalPositions = useMemo(() => {
    const currentLocation = location.data
    if (!currentLocation || heading == null) return []
    return ANIMALS.map((animal) => ({
      animal,
      position: calculateAnimalPosition(animal, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        altitude: currentLocation.altitude,
        heading,
      }, heading),
    }))
  }, [location.data, heading])

  const start3DAr = async () => {
    if (!location.data || xrStarting || xrActive) return
    setXrStarting(true)
    setXrUnavailable(false)
    try {
      const session = await startWebXRAnimalSession(ANIMALS, location.data, () => {
        xrSessionRef.current = null
        setXrActive(false)
      })
      if (!session) {
        setXrUnavailable(true)
        return
      }
      xrSessionRef.current = session
      setXrActive(true)
    } catch {
      setXrUnavailable(true)
    } finally {
      setXrStarting(false)
    }
  }

  const nearbyCount = animalPositions.filter((ap) => ap.position.visible).length
  const arUnsupported = arSupport.status === 'unsupported'
  const showFallback = fallbackMode || arUnsupported

  if (showFallback && !camera.state.stream) {
    return (
      <div className="camera-page">
        <Header title="Keşif Modu" showBack onBack={() => onNavigate('/')} />
        <div className="fallback-mode">
          <div className="fallback-icon" aria-hidden="true">🧭</div>
          <StatusMessage type="info" title="Uyumluluk modu" message="Cihaz gelişmiş sensörleri desteklemese bile yakındaki sanal hayvanları keşfedebilirsin." />
          <p>Aşağıdaki listede yakındaki hayvanları görebilirsin.</p>
          <div className="fallback-list">
            {animalPositions.length > 0 ? (
              animalPositions.filter((ap) => ap.position.visible).map((ap) => (
                <div key={ap.animal.id} className="fallback-animal">
                  <img src={ap.animal.image} alt={ap.animal.name} />
                  <div><strong>{ap.animal.name}</strong><span>{Math.round(ap.position.distance)}m - {ap.position.bearing.toFixed(0)}°</span></div>
                </div>
              ))
            ) : (
              <p className="fallback-empty">{location.status === 'permission-denied' ? 'Konum izni reddedildi. Yakındaki hayvanları görmek için konum izni verin.' : 'Konum alınıyor veya yakında hayvan yok.'}</p>
            )}
          </div>
          <Button variant="secondary" onClick={() => onNavigate('/explore')}>Keşfet Sayfasına Git</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="camera-page" ref={containerRef}>
      <div className="camera-top-bar">
        <button className="camera-back" onClick={() => onNavigate('/')} aria-label="Geri">←</button>
        <div className="gps-info"><span>{location.data ? `📍 ±${Math.round(location.data.accuracy)}m` : '📍 Konum bekleniyor...'}</span></div>
        <CameraStatus state={camera.state} />
      </div>

      <div className="camera-stage">
        {camera.state.status === 'ready' ? (
          <>
            <CameraView state={camera.state} />
            <div className="ar-overlay">
              {animalPositions.map((ap) => (
                <AnimalMarker key={ap.animal.id} animal={ap.animal} position={ap.position} screenWidth={viewport.width} screenHeight={viewport.height} fieldOfView={FIELD_OF_VIEW} verticalFieldOfView={VERTICAL_FIELD_OF_VIEW} onSelect={() => setSelected(ap.animal)} />
              ))}
            </div>
            {arSupport.hasImmersiveAr && !xrActive && !xrUnavailable && (
              <button className="camera-3d-ar-button" onClick={() => void start3DAr()} disabled={xrStarting || !location.data}>
                {xrStarting ? '3D AR başlatılıyor…' : '🥽 Gerçek 3D AR'}
              </button>
            )}
            {xrActive && <div className="camera-3d-ar-active" role="status">🥽 3D AR aktif</div>}
            {xrUnavailable && <div className="camera-3d-ar-active" role="status">📱 Kamera + sensör 3D modu aktif</div>}
          </>
        ) : (
          <CameraPermission onRequest={camera.start} />
        )}

        {camera.state.status === 'permission-denied' && <StatusMessage type="error" title="Kamera İzni Reddedildi" message="Tarayıcı ayarlarından kamera iznini verin ve tekrar deneyin." action={{ label: 'Tekrar Dene', onClick: camera.start }} />}
        {camera.state.status === 'https-required' && <StatusMessage type="warning" title="HTTPS Gerekli" message="Kamera API'si için HTTPS bağlantısı zorunludur." />}
        {camera.state.status === 'unsupported' && <StatusMessage type="error" title="Kamera Desteklenmiyor" message="Bu cihaz veya tarayıcı kamera API desteklemiyor." action={{ label: 'Keşif Modunu Aç', onClick: () => setFallbackMode(true) }} />}
        {camera.state.status === 'error' && <StatusMessage type="error" title="Kamera Kullanılamıyor" message={camera.state.error || 'Bilinmeyen hata.'} action={{ label: 'Tekrar Dene', onClick: camera.start }} />}
        {orientation.status === 'permission-required' && <StatusMessage type="warning" title="Pusula İzni Gerekli" message="Hayvanların yönünü doğru göstermek için sensör izni gerekiyor." action={{ label: 'İzin İste', onClick: () => orientation.requestPermission() }} />}
        {orientation.status === 'permission-denied' && <StatusMessage type="warning" title="Pusula İzni Reddedildi" message="Yön sensörü izni olmadan GPS tabanlı keşif devam eder." />}
        {location.status === 'permission-denied' && <StatusMessage type="warning" title="Konum İzni Gerekli" message="Sanal hayvanları gerçek dünyadaki konumlarına göre göstermek için konum erişimine izin ver." />}
        {location.data && location.data.accuracy > 100 && <StatusMessage type="info" title="GPS Doğruluğu Düşük" message={`GPS doğruluğu ±${Math.round(location.data.accuracy)}m. Daha iyi sonuç için açık alana çıkın.`} />}
      </div>

      <div className="camera-bottom-bar">
        <div className="nearby-count"><span className="count-icon" aria-hidden="true">🐾</span><span>{nearbyCount} hayvan yakında</span></div>
        <button className="camera-nav-btn" onClick={() => onNavigate('/explore')}>🧭 Keşfet</button>
        <button className="camera-nav-btn" onClick={() => onNavigate('/animals')}>🐾 Hayvanlarım</button>
      </div>

      <AnimalInfo animal={selected} distance={selected && location.data ? calculateDistance(location.data.latitude, location.data.longitude, selected.latitude, selected.longitude) : undefined} onClose={() => setSelected(null)} onApproach={() => setSelected(null)} onInspect={() => { setSelected(null); onNavigate('/animals') }} />
    </div>
  )
}
