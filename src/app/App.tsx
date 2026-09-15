import { useState, useEffect, useCallback } from 'react'
import { ROUTES } from './routes'
import { BottomNavigation } from '../components/Layout/BottomNavigation'
import { HomePage } from '../pages/HomePage'
import { ExplorePage } from '../pages/ExplorePage'
import { CameraPage } from '../pages/CameraPage'
import { AnimalsPage } from '../pages/AnimalsPage'
import { ProfilePage } from '../pages/ProfilePage'
import '../styles/global.css'

function getCurrentPath(): string {
  const hash = window.location.hash.replace('#', '')
  return hash || ROUTES.HOME
}

export function App() {
  const [path, setPath] = useState<string>(getCurrentPath())

  useEffect(() => {
    const onHashChange = () => setPath(getCurrentPath())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((newPath: string) => {
    window.location.hash = newPath
    setPath(newPath)
    window.scrollTo(0, 0)
  }, [])

  const isCamera = path === ROUTES.CAMERA

  return (
    <div className="app">
      <main className="app-main">
        {path === ROUTES.HOME && <HomePage onNavigate={navigate} />}
        {path === ROUTES.EXPLORE && <ExplorePage />}
        {path === ROUTES.CAMERA && <CameraPage onNavigate={navigate} />}
        {path === ROUTES.ANIMALS && <AnimalsPage />}
        {path === ROUTES.PROFILE && <ProfilePage />}
        {!Object.values(ROUTES).includes(path as never) && (
          <HomePage onNavigate={navigate} />
        )}
      </main>
      {!isCamera && (
        <BottomNavigation currentPath={path} onNavigate={navigate} />
      )}
    </div>
  )
}
