interface NavItem {
  label: string
  icon: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Ana Sayfa', icon: '🏠', path: '/' },
  { label: 'Keşfet', icon: '🧭', path: '/explore' },
  { label: 'Kamera', icon: '📷', path: '/camera' },
  { label: 'Hayvanlar', icon: '🐾', path: '/animals' },
  { label: 'Profil', icon: '👤', path: '/profile' },
]

interface BottomNavigationProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export function BottomNavigation({ currentPath, onNavigate }: BottomNavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Alt navigasyon">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPath === item.path
        const isCamera = item.path === '/camera'
        return (
          <button
            key={item.path}
            className={`nav-item ${isActive ? 'nav-active' : ''} ${isCamera ? 'nav-camera' : ''}`}
            onClick={() => onNavigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
