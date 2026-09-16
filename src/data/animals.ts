import type { Animal } from '../types/animal'

export const ANIMALS: Animal[] = [
  { id: 'cat-01', name: 'Minik Kedi', species: 'Felis catus', description: 'Sevimli ve meraklı bir kedi.', image: '/animals/cat.svg', latitude: 41.0082, longitude: 28.9784, altitude: 30, rarity: 'common', level: 1, isOwned: false, priceTl: 49.90, isForSale: true, followDistanceM: 1.5 },
  { id: 'dog-01', name: 'Gökyüzü Köpeği', species: 'Canis lupus familiaris', description: 'Gökyüzüne bakan, hayalperest bir köpek.', image: '/animals/dog.svg', latitude: 41.0120, longitude: 28.9760, altitude: 35, rarity: 'uncommon', level: 3, isOwned: false, priceTl: 79.90, isForSale: true, followDistanceM: 1.5 },
  { id: 'rabbit-01', name: 'Orman Tavşanı', species: 'Lepus europaeus', description: 'Hızlı ve çevik bir tavşan.', image: '/animals/rabbit.svg', latitude: 41.0050, longitude: 28.9820, altitude: 25, rarity: 'common', level: 2, isOwned: false, priceTl: 39.90, isForSale: true, followDistanceM: 1.5 },
  { id: 'fox-01', name: 'Ateş Tilkisi', species: 'Vulpes vulpes', description: 'Ateş renkli tüyleri olan nadir bir tilki.', image: '/animals/fox.svg', latitude: 41.0150, longitude: 28.9700, altitude: 40, rarity: 'rare', level: 5, isOwned: false, priceTl: 129.90, isForSale: true, followDistanceM: 1.5 },
  { id: 'bird-01', name: 'Mavi Kuş', species: 'Sialia currucoides', description: 'Gökyüzünün özgürlük sembolü.', image: '/animals/bird.svg', latitude: 41.0200, longitude: 28.9850, altitude: 100, rarity: 'legendary', level: 10, isOwned: false, priceTl: 159.90, isForSale: true, followDistanceM: 1.5 },
]
