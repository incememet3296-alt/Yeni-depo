import { useState } from 'react'
import { AnimalCard } from '../components/Animal/AnimalCard'
import { AnimalInfo } from '../components/Animal/AnimalInfo'
import { Button } from '../components/UI/Button'
import { useAnimals } from '../hooks/useAnimals'
import { getAnimalStore } from '../lib/animal-store'
import type { Animal } from '../types/animal'

export function AnimalsPage() {
  const { animals, loading, error } = useAnimals()
  const [selected, setSelected] = useState<Animal | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const owned = animals.filter((animal) => animal.isOwned)

  const buy = async (animal: Animal) => {
    setBusyId(animal.id)
    setMessage(null)
    try {
      await getAnimalStore().purchaseAnimal(animal.id)
      setMessage(`${animal.name} hesabınıza eklendi. Kamerayı açtığınızda yanınızda görünecek.`)
      window.location.reload()
    } catch (reason: unknown) {
      setMessage(reason instanceof Error ? reason.message : 'Satın alma tamamlanamadı.')
    } finally {
      setBusyId(null)
    }
  }

  const activate = async (animal: Animal) => {
    setBusyId(animal.id)
    setMessage(null)
    try {
      await getAnimalStore().setActiveAnimal(animal.id)
      setMessage(`${animal.name} aktif hayvanınız oldu.`)
      window.location.reload()
    } catch (reason: unknown) {
      setMessage(reason instanceof Error ? reason.message : 'Aktif hayvan seçilemedi.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="animals-page">
      <div className="animals-header">
        <h1>Sanal Hayvanlar</h1>
        <p>Bir hayvan satın alın. Kamerayı açtığınızda kendi hayvanınız telefon konumunuza göre yanınızda olacak.</p>
      </div>

      <div className="animals-stats">
        <div className="stat-pill"><span className="stat-number">{owned.length}</span><span className="stat-text">Benim Hayvanlarım</span></div>
        <div className="stat-pill"><span className="stat-number">{animals.length}</span><span className="stat-text">Mağaza</span></div>
      </div>

      {error && <p className="status-message warning">{error}</p>}
      {message && <p className="status-message info">{message}</p>}

      {loading ? <p>Hayvanlar yükleniyor…</p> : (
        <>
          <h2 className="section-title">Hayvan Mağazası</h2>
          <div className="animals-grid">
            {animals.map((animal) => (
              <div key={animal.id}>
                <AnimalCard animal={animal} onClick={() => setSelected(animal)} />
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {animal.isOwned ? (
                    <Button variant="secondary" onClick={() => void activate(animal)} disabled={busyId === animal.id}>
                      {busyId === animal.id ? 'İşleniyor…' : '📍 Yanımda Aktif Et'}
                    </Button>
                  ) : (
                    <Button onClick={() => void buy(animal)} disabled={busyId === animal.id || !animal.isForSale}>
                      {busyId === animal.id ? 'Satın alınıyor…' : animal.isForSale ? `🐾 Satın Al · ₺${animal.priceTl.toFixed(2)}` : 'Satışta Değil'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AnimalInfo animal={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
