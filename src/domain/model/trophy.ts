/**
 * Structured detail for holders whose extra info is a UI label built from
 * data (B3's ratio, A4's broken streak, C1's peak date) — resolved to text
 * via i18n in the UI layer. A plain `string` is used instead for the two
 * holders whose detail is pure user data (D1's game type name, E1's rival
 * name), not an interface label.
 */
export type TrophyHolderDetail =
  | string
  | { kind: 'ratio'; wins: number; played: number }
  | { kind: 'streakBroken'; brokenPlayerName: string }
  | { kind: 'date'; epochMs: number }

export interface TrophyHolder {
  playerId: string
  name: string
  value: number
  detail?: TrophyHolderDetail
}

/**
 * Not persisted — trophies are recomputed from Match/GameType/Player data
 * on every display, so there is no zod schema and no backward-compat concern.
 * `title`/`description` live in i18n, resolved from `id` by the UI.
 */
export interface Trophy {
  id: string
  holders: TrophyHolder[]
  /** Optional display unit for each holder's value, resolved via i18n by the UI. */
  unit?: 'elo' | 'days'
}
