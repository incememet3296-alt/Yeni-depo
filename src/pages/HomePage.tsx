import { Button } from '../components/UI/Button'

interface HomePageProps {
  onNavigate: (path: string) => void
}

const STEPS = [
  { icon: '📷', title: 'Kamera', desc: 'Arka kamerayı aç ve gerçek dünyayı gör.' },
  { icon: '📍', title: 'Konum', desc: 'GPS ile konumun belirlenir.' },
  { icon: '🐾', title: 'Sanal Hayvan', desc: 'Çevrendeki hayvanlar keşif yarıçapında belirir.' },
  { icon: '🧭', title: 'Keşfet', desc: 'Yönünü çevirerek hayvanları bul ve incele.' },
]

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-badge">🐾 Sanal Hayvan</div>
        <h1 className="hero-title">Sanal Hayvan</h1>
        <p className="hero-subtitle">
          Gerçek dünyayı keşfet, sanal hayvanlarını bul.
        </p>
        <div className="hero-actions">
          <Button size="lg" onClick={() => onNavigate('/explore')}>
            Keşfetmeye Başla
          </Button>
          <Button size="lg" variant="secondary" onClick={() => onNavigate('/camera')}>
            📷 Kamerayı Aç
          </Button>
        </div>
      </section>

      <section className="home-steps">
        <h2>Nasıl Çalışır?</h2>
        <div className="steps-grid">
          {STEPS.map((step, i) => (
            <div key={i} className="step-card">
              <div className="step-icon" aria-hidden="true">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
