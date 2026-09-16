import type { User } from '@supabase/supabase-js'
import { useAnimals } from '../hooks/useAnimals'
import { supabase } from '../lib/supabase'
import { Button } from '../components/UI/Button'

interface ProfilePageProps {
  user: User | null
  onNavigate: (path: string) => void
}

export function ProfilePage({ user, onNavigate }: ProfilePageProps) {
  const { animals, loading } = useAnimals()
  const owned = animals.filter((animal) => animal.isOwned).length
  const total = animals.length
  const completion = total > 0 ? Math.round((owned / total) * 100) : 0

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <div className="profile-avatar" aria-hidden="true">🐾</div>
          <h1>Hesabınız</h1>
          <p>Sanal hayvanınızı görmek ve yönetmek için giriş yapın.</p>
        </div>
        <Button onClick={() => onNavigate('/giris')}>Giriş Yap / Kayıt Ol</Button>
      </div>
    )
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    onNavigate('/')
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">🐾</div>
        <h1>Hesabım</h1>
        <p>{user.email}</p>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="stat-number">{loading ? '—' : owned}</span>
          <span className="stat-text">Sahiplenilen</span>
        </div>
        <div className="profile-stat">
          <span className="stat-number">{loading ? '—' : total}</span>
          <span className="stat-text">Toplam Hayvan</span>
        </div>
        <div className="profile-stat">
          <span className="stat-number">{loading ? '—' : `${completion}%`}</span>
          <span className="stat-text">Tamamlanma</span>
        </div>
      </div>

      <div className="profile-info">
        <h2>Hesap</h2>
        <p>Bu hesap, satın aldığınız sanal hayvanı sizinle eşleştirmek için kullanılır.</p>
      </div>

      <Button variant="ghost" onClick={signOut}>Çıkış Yap</Button>
    </div>
  )
}
