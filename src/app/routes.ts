export const ROUTES = {
  HOME: '/',
  EXPLORE: '/explore',
  CAMERA: '/camera',
  ANIMALS: '/animals',
  PROFILE: '/profile',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export const ROUTE_PATHS = Object.values(ROUTES)
