export const COULEURS_JOUEURS = [
  '#e6a817',
  '#e74c3c',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#e67e22',
  '#1abc9c',
  '#fd79a8',
] as const

export const EMOJIS_RANG = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'] as const

/**
 * Series bonus by run length. A `Map` rather than an object literal: the lookup
 * has to be able to miss (runs of 1 or 2 pay nothing) and `calculerScore` keys
 * its decision off that miss, exactly as the Kotlin `mapOf` lookup did.
 */
export const BONUS_SERIES: ReadonlyMap<number, number> = new Map([
  [3, 100],
  [4, 200],
  [5, 500],
  [6, 1000],
  [7, 2000],
  [8, 4000],
  [9, 4000],
])

export interface TypeDe {
  readonly id: string
  readonly icone: string
  readonly label: string
}

export const TYPES_DES: readonly TypeDe[] = [
  { id: 'skulls', icone: '💀', label: 'Crâne' },
  { id: 'diamonds', icone: '💎', label: 'Diamant' },
  { id: 'gold', icone: '🪙', label: 'Or' },
  { id: 'monkeys', icone: '🐒', label: 'Singe' },
  { id: 'parrots', icone: '🦜', label: 'Perroquet' },
  { id: 'sabers', icone: '⚔️', label: 'Sabre' },
]

export interface DefCarte {
  readonly id: string
  readonly label: string
}

export const CARTES: readonly DefCarte[] = [
  { id: 'none', label: '— Aucune carte —' },
  { id: 'captain', label: '👑 Capitaine (score ×2)' },
  { id: 'diamond', label: '💎 Diamant (+1 diamant)' },
  { id: 'gold', label: "🪙 Pièce d'or (+1 pièce)" },
  { id: 'animals', label: '🐒🦜 Animaux (singes = perroquets)' },
  { id: 'witch', label: '🧙 Sorcière (relancer 1 crâne)' },
  { id: 'sea2', label: '⚔️⚔️ Combat (2 sabres)' },
  { id: 'sea3', label: '⚔️⚔️⚔️ Combat (3 sabres)' },
  { id: 'sea4', label: '⚔️⚔️⚔️⚔️ Combat (4 sabres)' },
  { id: 'skull1', label: '💀 Tête de mort (×1)' },
  { id: 'skull2', label: '💀💀 Tête de mort (×2)' },
]
