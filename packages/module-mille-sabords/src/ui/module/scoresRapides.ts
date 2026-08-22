/**
 * The manual tab's cheat sheet: every score a hand can be worth, one tap each.
 *
 * The values are the game's own — three diamonds pay 300 for the diamonds plus
 * the 100 series bonus — and are copied from the Kotlin screen unchanged. They
 * duplicate nothing from `calculerScore`: that computes a whole hand from the
 * dice, these let a player who has already read the dice enter one part of it.
 */
export interface BoutonRapide {
  readonly label: string
  /** Points added to the field; a naval defeat subtracts. */
  readonly points: number
  readonly titre: string
}

export interface GroupeRapide {
  readonly titre: string
  readonly boutons: readonly BoutonRapide[]
}

function serie(icone: string): BoutonRapide[] {
  return [
    { label: `1${icone}`, points: 100, titre: '+100 pts' },
    { label: `2${icone}`, points: 200, titre: '+200 pts' },
    { label: `3${icone}`, points: 400, titre: '+400 pts (300 + 100 de série)' },
    { label: `4${icone}`, points: 600, titre: '+600 pts (400 + 200 de série)' },
    { label: `5${icone}`, points: 1000, titre: '+1000 pts (500 + 500 de série)' },
    { label: `6${icone}`, points: 1600, titre: '+1600 pts (600 + 1000 de série)' },
    { label: `7${icone}`, points: 2700, titre: '+2700 pts (700 + 2000 de série)' },
    { label: `8${icone}`, points: 4800, titre: '+4800 pts (800 + 4000 de série)' },
  ]
}

export const GROUPES_RAPIDES: readonly GroupeRapide[] = [
  { titre: '💎 Diamants', boutons: serie('💎') },
  { titre: "🪙 Pièces d'or", boutons: serie('🪙') },
  {
    titre: '🎲 Séries identiques',
    boutons: [
      { label: '3🎲', points: 100, titre: '+100 pts' },
      { label: '4🎲', points: 200, titre: '+200 pts' },
      { label: '5🎲', points: 500, titre: '+500 pts' },
      { label: '6🎲', points: 1000, titre: '+1000 pts' },
      { label: '7🎲', points: 2000, titre: '+2000 pts' },
      { label: '8🎲', points: 4000, titre: '+4000 pts' },
    ],
  },
  {
    titre: '🏆 Coffre plein',
    boutons: [{ label: 'Coffre', points: 500, titre: '+500 pts' }],
  },
  {
    titre: '⚔️ Combat naval',
    boutons: [
      { label: '2⚔️ ✅', points: 300, titre: '+300 pts' },
      { label: '2⚔️ ❌', points: -300, titre: '-300 pts' },
      { label: '3⚔️ ✅', points: 500, titre: '+500 pts' },
      { label: '3⚔️ ❌', points: -500, titre: '-500 pts' },
      { label: '4⚔️ ✅', points: 1000, titre: '+1000 pts' },
      { label: '4⚔️ ❌', points: -1000, titre: '-1000 pts' },
    ],
  },
]

/** Skull counts the Île de la Tête de Mort offers as one tap, as the Kotlin screen did. */
export const CRANES_ILE_RAPIDE: readonly number[] = [4, 5, 6, 7, 8, 9, 10]

/** The contextual hint the calculator shows under the card picker. */
export const INFOS_CARTE: Readonly<Record<string, string>> = {
  diamond: '💎 +1 diamant ajouté par la carte · 8 diamants aux dés = Magie Pirate !',
  gold: "🪙 +1 pièce d'or ajoutée par la carte · 8 pièces aux dés = Magie Pirate !",
  skull1: '💀 +1 crâne ajouté par la carte (ne le comptez pas dans les dés)',
  skull2: '💀💀 +2 crânes ajoutés par la carte (ne les comptez pas dans les dés)',
  animals: '🐒🦜 Singes et perroquets comptent ensemble pour les séries',
  captain: '👑 Le score final sera doublé',
  sea2: '⚔️ Vous devez obtenir au moins 2 sabres',
  sea3: '⚔️ Vous devez obtenir au moins 3 sabres',
  sea4: '⚔️ Vous devez obtenir au moins 4 sabres',
}
