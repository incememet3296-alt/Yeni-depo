import { useAnimals } from '../hooks/useAnimals'

export function ProfilePage() {
  const { animals, loading } = useAnimals()
  const owned = animals.filter((animal) => animal.isOwned).length
  const total = animals.length
  const completion = total > 0 ? Math.round((owned / total) * 100) : 0

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">🐾</div>
        <h1>Kaşif</h1>
        <p>Sanal Hayvan Kaşifi</p>
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
        <h2>Hakkında</h2>
        <p>
          Sanal Hayvan, gerçek dünyada sanal hayvanlar keşfetmeni sağlayan bir
          artırılmış gerçeklik deneyimidir. Telefonunun kamerasını aç, çevreni
          keşfet ve hayvanları bul!
        </p>
      </div>
    </div>
  )
}
