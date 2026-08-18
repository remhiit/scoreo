export const TORII_COLORS = ['green', 'red', 'blue', 'yellow', 'purple'] as const
export type ToriiColor = (typeof TORII_COLORS)[number]

export const MAX_TORII_PER_COLOR = 7

export type ToriiCounts = Record<ToriiColor, number>

export function emptyToriiCounts(): ToriiCounts {
  return { green: 0, red: 0, blue: 0, yellow: 0, purple: 0 }
}

/** VP for a series of N differently-colored Torī, indexed by N (rulebook p.4: 1→0, 2→2, 3→4, 4→7, 5→10). */
const SERIES_SCORE = [0, 0, 2, 4, 7, 10]

/**
 * Torī are scored by grouping them into series of distinct colors; the same
 * physical Torī can't belong to two series (rulebook p.4). SERIES_SCORE's
 * marginal gains (0, 2, 2, 3, 3) are non-decreasing, so the total is maximized
 * by making series as large as possible before starting a new one — i.e. by
 * repeatedly forming one series out of every color still available. This
 * greedy peel reproduces the rulebook's own worked example (8 Torī → 12 VP).
 */
export function scoreTorii(counts: ToriiCounts): number {
  const remaining = { ...counts }
  let total = 0
  for (;;) {
    const colorsAvailable = TORII_COLORS.filter((color) => remaining[color] > 0)
    if (colorsAvailable.length === 0) break
    total += SERIES_SCORE[colorsAvailable.length]
    for (const color of colorsAvailable) remaining[color] -= 1
  }
  return total
}
