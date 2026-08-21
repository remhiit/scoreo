export const LANDSCAPE_TYPES = ['bamboo', 'cherryBlossom', 'mountain', 'water', 'village'] as const
export type LandscapeType = (typeof LANDSCAPE_TYPES)[number]

export type ObjectifPoints = Record<LandscapeType, number>

export function emptyObjectifPoints(): ObjectifPoints {
  return { bamboo: 0, cherryBlossom: 0, mountain: 0, water: 0, village: 0 }
}

/** Difficulty variants an Objectif card comes in; see doc/functional/features/objectif-cards.md. */
export const OBJECTIF_VARIANTS = ['A', 'B', 'C'] as const
export type ObjectifVariant = (typeof OBJECTIF_VARIANTS)[number]

/**
 * Setup deals exactly one Objectif card per landscape, so a match's selection
 * is one variant per landscape — never zero, never several. The Torī scoring
 * card is always in play and is not part of the selection.
 */
export type ObjectifCardSelection = Record<LandscapeType, ObjectifVariant>

export function defaultObjectifCardSelection(): ObjectifCardSelection {
  return { bamboo: 'A', cherryBlossom: 'A', mountain: 'A', water: 'A', village: 'A' }
}

export function isObjectifVariant(value: string): value is ObjectifVariant {
  return (OBJECTIF_VARIANTS as readonly string[]).includes(value)
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
