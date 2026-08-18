export const LANDSCAPE_TYPES = ['bamboo', 'cherryBlossom', 'mountain', 'water', 'village'] as const
export type LandscapeType = (typeof LANDSCAPE_TYPES)[number]

export type ObjectifPoints = Record<LandscapeType, number>

export function emptyObjectifPoints(): ObjectifPoints {
  return { bamboo: 0, cherryBlossom: 0, mountain: 0, water: 0, village: 0 }
}

export function landscapeTypeLabel(type: LandscapeType): string {
  switch (type) {
    case 'bamboo':
      return 'Bamboo'
    case 'cherryBlossom':
      return 'Cherry Blossom'
    case 'mountain':
      return 'Mountain'
    case 'water':
      return 'Water'
    case 'village':
      return 'Village'
  }
}
