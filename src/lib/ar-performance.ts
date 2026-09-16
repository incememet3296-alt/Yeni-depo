export interface ArPerformanceProfile {
  pixelRatio: number
  maxAnimals: number
  meshSegments: number
  meshRings: number
  targetFps: number
}

export function getArPerformanceProfile(): ArPerformanceProfile {
  if (typeof window === 'undefined') {
    return { pixelRatio: 1, maxAnimals: 24, meshSegments: 10, meshRings: 6, targetFps: 30 }
  }

  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  const dpr = window.devicePixelRatio || 1

  if (cores <= 2 || memory <= 2) {
    return { pixelRatio: Math.min(dpr, 1), maxAnimals: 8, meshSegments: 8, meshRings: 5, targetFps: 24 }
  }
  if (cores <= 4 || memory <= 4) {
    return { pixelRatio: Math.min(dpr, 1.25), maxAnimals: 16, meshSegments: 10, meshRings: 6, targetFps: 30 }
  }
  return { pixelRatio: Math.min(dpr, 1.75), maxAnimals: 32, meshSegments: 12, meshRings: 8, targetFps: 60 }
}

export function limitVisibleAnimals<T>(animals: T[], maxAnimals: number): T[] {
  return animals.slice(0, maxAnimals)
}
