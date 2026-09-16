import { useMemo, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Layout/Header'
import { CameraView } from '../components/Camera/CameraView'
import { CameraPermission } from '../components/Camera/CameraPermission'
import { CameraStatus } from '../components/Camera/CameraStatus'
import { AnimalMarker } from '../components/Animal/AnimalMarker'
import { Animal3D } from '../components/Animal/Animal3D'
import { SensorArFallback } from '../components/Camera/SensorArFallback'
import { AnimalInfo } from '../components/Animal/AnimalInfo'
import { StatusMessage } from '../components/UI/StatusMessage'
import { Button } from '../components/UI/Button'
import { useCamera } from '../hooks/useCamera'
import { useLocation } from '../hooks/useLocation'
import { useOrientation } from '../hooks/useOrientation'
import { useArSupport } from '../hooks/useArSupport'
import { useAnimals } from '../hooks/useAnimals'
import { getHeading, normalizeHeading } from '../lib/compass'
import { calculateAnimalPosition, getFollowingPetLocation } from '../lib/animal-position'
import { getArPerformanceProfile } from '../lib/ar-performance'
import { startWebXRAnimalSession } from '../lib/webxr-ar'
import type { Animal } from '../types/animal'
import type { LocationData } from '../lib/location'
import '../styles/ar-3d.css'

const FIELD_OF_VIEW = 60
const VERTICAL_FIELD_OF_VIEW = 45
const HEADING_SMOOTHING = 0.18
const LOCATION_SMOOTHING_MIN = 0.12
const LOCATION_SMOOTHING_MAX = 0.45

type WebXRSession = Awaited<ReturnType<typeof startWebXRAnimalSession>>
interface CameraPageProps { onNavigate: (path: string) => void }

function smoothCircularHeading(previous: number | null, current: number) {
  if (previous == null) return normalizeHeading(current)
  const delta = ((current - previous + 540) % 360) - 180
  return normalizeHeading(previous + delta * HEADING_SMOOTHING)
}

function smoothLocation(previous: LocationData | null, current: LocationData): LocationData {
  if (!previous) return current
  const accuracyRatio = Math.min(Math.max(current.accuracy / 50, 0), 1)
  const alpha = LOCATION_SMOOTHING_MAX - accuracyRatio * (LOCATION_SMOOTHING_MAX - LOCATION_SMOOTHING_MIN)
  return {
    ...current,
    latitude: previous.latitude + (current.latitude - previous.latitude) * alpha,
    longitude: previous.longitude + (current.longitude - previous.longitude) * alpha,
    altitude: previous.altitude == null || current.altitude == null ? current.altitude : previous.altitude + (current.altitude - previous.altitude) * alpha,
  }
}

export function CameraPage({ onNavigate }: CameraPageProps) {
  const camera = useCamera()
  const location = useLocation()
  const orientation = useOrientation()
  const arSupport = useArSupport()
  const { animals, loading: animalsLoading, error: animalsError } = useAnimals(true)
  const [selected, setSelected] = useState<Animal | null>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [xrStarting, setXrStarting] = useState(false)
  const [xrActive, setXrActive] = useState(false)
  const [xrUnavailable, setXrUnavailable] = useState(false)
  const xrSessionRef = useRef<WebXRSession>(null)
  const headingRef = useRef<number | null>(null)
  const locationRef = useRef<LocationData | null>(null)
  const performanceProfile = useMemo(() => getArPerformanceProfile(), [])

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize) }
  }, [])

  useEffect(() => () => { void xrSessionRef.current?.end(); xrSessionRef.current = null }, [])

  const filteredLocation = useMemo(() => {
    if (!location.data) return null
    const next = smoothLocation(locationRef.current, location.data)
    locationRef.current = next
    return next
  }, [location.data])

  const rawHeading = useMemo(() => getHeading(orientation.data, filteredLocation?.heading), [orientation.data, filteredLocation?.heading])
  const heading = useMemo(() => {
    const next = smoothCircularHeading(headingRef.current, rawHeading ?? 0)
    headingRef.current = next
    return next
  }, [rawHeading])

  const pet = animals[0] ?? null
  const petForWorld = useMemo(() => {
    if (!pet || !filteredLocation) return null
    const followed = getFollowingPetLocation({ ...filteredLocation, heading }, pet, heading)
    return { ...pet, ...followed }
  }, [pet, filteredLocation, heading])

  const animalPositions = useMemo(() => {
    if (!pet || !filteredLocation || !petForWorld) return []
    return [{
      animal: pet,
      position: calculateAnimalPosition(pet, { ...filteredLocation, heading }, heading),
    }]
  }, [pet, petForWorld, filteredLocation, heading])

  const selectPet = () => setSelected(pet)

  const start3DAr = async () => {
    if (!petForWorld || !filteredLocation || xrStarting || xrActive) return
    setXrStarting(true)
    setXrUnavailable(false)
    try {
      const session = await startWebXRAnimalSession([petForWorld], { ...filteredLocation, heading }, () => {
        xrSessionRef.current = null
        setXrActive(false)
      })
      if (!session) { setXrUnavailable(true); return }
      session.addEventListener('select', selectPet as EventListener)
      session.addEventListener('selectstart', selectPet as EventListener)
      xrSessionRef.current = session
      setXrActive(true)
    } catch {
      setXrUnavailable(true)
    } finally {
      setXrStarting(false)
    }
  }

  const arUnsupported = arSupport.status === 'unsupported'
  const showFallback = arUnsupported || xrUnavailable

  if (showFallback && !camera.state.stream) {
    return <div className="camera-page"><Header title="Benim Hayvanım" showBack onBack={() => onNavigate('/')} /><div className="fallback-mode">
      <div className="fallback-icon" aria-hidden="true">🐾</div>
      {!pet ? <><StatusMessage type="info" title="Henüz sanal hayvanınız yok" message="Önce mağazadan kendi hayvanınızı satın alın." /><Button onClick={() => onNavigate('/animals')}>🐾 Hayvan Satın Al</Button></> : <><StatusMessage type="info" title={`${pet.name} sizinle`} message="Hayvanınız telefonunuzun canlı konumuna göre yanınızda tutulur." /><Animal3D rarity={pet.rarity} size={120} /><Button onClick={() => void camera.start()}>📷 Kamerayı Aç</Button></>}
    </div></div>
  }

  return <div className="camera-page">
    <div className="camera-top-bar"><button className="camera-back" onClick={() => onNavigate('/')} aria-label="Geri">←</button><div className="gps-info"><span>{filteredLocation ? `📍 ±${Math.round(filteredLocation.accuracy)}m` : '📍 Konum bekleniyor...'}</span></div><CameraStatus state={camera.state} /></div>
    <div className="camera-stage">
      {camera.state.status === 'ready' ? <>
        <CameraView state={camera.state} />
        {!pet ? <div className="ar-overlay" style={{ display: 'grid', placeItems: 'center', padding: 24 }}><div style={{ textAlign: 'center', background: 'rgba(0,0,0,.7)', borderRadius: 18, padding: 20 }}><div style={{ fontSize: 56 }}>🐾</div><strong>Önce kendi hayvanınızı satın alın</strong><p>Bu kamera yalnızca size ait sanal hayvanı gösterir.</p><Button onClick={() => onNavigate('/animals')}>Hayvan Mağazasına Git</Button></div></div> : showFallback ? <SensorArFallback items={animalPositions} screenWidth={viewport.width} screenHeight={viewport.height} fieldOfView={FIELD_OF_VIEW} verticalFieldOfView={VERTICAL_FIELD_OF_VIEW} onSelect={setSelected} /> : <div className="ar-overlay">{animalPositions.map((ap) => <AnimalMarker key={ap.animal.id} animal={ap.animal} position={ap.position} screenWidth={viewport.width} screenHeight={viewport.height} fieldOfView={FIELD_OF_VIEW} verticalFieldOfView={VERTICAL_FIELD_OF_VIEW} onSelect={selectPet} />)}</div>}
        {pet && arSupport.hasImmersiveAr && !xrActive && !xrUnavailable && <button className="camera-3d-ar-button" onClick={() => void start3DAr()} disabled={xrStarting || !filteredLocation || animalsLoading}>{xrStarting ? '3D AR başlatılıyor…' : '🥽 Gerçek 3D AR'}</button>}
        {xrActive && <div className="camera-3d-ar-active" role="status">🥽 3D AR aktif — {pet?.name} yanınızda</div>}
      </> : <CameraPermission onRequest={camera.start} />}
      {animalsError && <StatusMessage type="warning" title="Hayvan verileri" message={animalsError} />}
      {orientation.status === 'permission-required' && <StatusMessage type="warning" title="Pusula İzni Gerekli" message="Hayvanınızın yanınızdaki konumunu doğru göstermek için sensör izni gerekiyor." action={{ label: 'İzin İste', onClick: () => orientation.requestPermission() }} />}
      {filteredLocation && filteredLocation.accuracy > 100 && <StatusMessage type="info" title="GPS Doğruluğu Düşük" message={`GPS doğruluğu ±${Math.round(filteredLocation.accuracy)}m. Daha iyi sonuç için açık alana çıkın.`} />}
    </div>
    <div className="camera-bottom-bar"><div className="nearby-count"><span className="count-icon" aria-hidden="true">🐾</span><span>{pet ? `${pet.name} yanınızda` : 'Hayvanınız yok'}</span></div><button className="camera-nav-btn" onClick={() => onNavigate('/animals')}>🐾 Hayvanlarım</button></div>
    <AnimalInfo animal={selected} distance={selected && filteredLocation ? calculateAnimalPosition(selected, { ...filteredLocation, heading }, heading).distance : undefined} onClose={() => setSelected(null)} onApproach={() => setSelected(null)} onInspect={() => { setSelected(null); onNavigate('/animals') }} />
  </div>
}
