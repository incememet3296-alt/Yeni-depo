export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface Animal {
  id: string
  name: string
  species: string
  description: string
  image: string
  latitude: number
  longitude: number
  altitude: number
  rarity: Rarity
  level: number
  isOwned: boolean
}

export interface AnimalPosition {
  id: string
  distance: number
  bearing: number
  relativeBearing: number
  verticalAngle: number
  visible: boolean
}

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  heading: number | null
}
