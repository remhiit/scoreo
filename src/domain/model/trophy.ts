export interface TrophyHolder {
  playerId: string
  name: string
  value: number
  detail?: string
}

/**
 * Not persisted — trophies are recomputed from Match/GameType/Player data
 * on every display, so there is no zod schema and no backward-compat concern.
 */
export interface Trophy {
  id: string
  title: string
  description: string
  holders: TrophyHolder[]
}
