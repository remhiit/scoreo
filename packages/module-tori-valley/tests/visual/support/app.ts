import { expect, type Locator, type Page } from '@playwright/test'
import { LANDSCAPE_TYPES, type ObjectifCardSelection } from '../../../src/domain/model/landscape'
import type { Match } from '../../../src/domain/model/match'
import type { Player } from '../../../src/domain/model/player'

/**
 * localStorage keys owned by the adapters in `src/infrastructure/localStorage/`
 * and by the i18n language detector (`src/i18n/index.ts`). Duplicated here
 * rather than imported, because those constants are module-private — if one of
 * them is ever renamed, the seeded screens fall back to their empty state and
 * the affected baselines fail loudly.
 */
const PLAYERS_KEY = 'tori_valley_players'
const MATCHES_KEY = 'tori_valley_matches'
const LANGUAGE_KEY = 'tori_valley_language'

export interface SeededState {
  players?: Player[]
  matches?: Match[]
  /** Pinned per test: an unset language would be detected from the browser and shift every label. */
  language?: 'en' | 'fr'
}

/**
 * Seeds localStorage before any app script runs, then navigates to `hash`.
 *
 * Every screen is reached by its own route rather than by clicking through the
 * previous one, so a broken Home screen fails exactly one baseline instead of
 * cascading through the whole suite.
 */
export async function openApp(page: Page, hash: string, state: SeededState = {}): Promise<void> {
  const seeded = {
    playersKey: PLAYERS_KEY,
    matchesKey: MATCHES_KEY,
    languageKey: LANGUAGE_KEY,
    players: state.players ?? [],
    matches: state.matches ?? [],
    language: state.language ?? 'en',
  }

  await page.addInitScript((s) => {
    localStorage.setItem(s.playersKey, JSON.stringify(s.players))
    localStorage.setItem(s.matchesKey, JSON.stringify(s.matches))
    localStorage.setItem(s.languageKey, s.language)
  }, seeded)

  await page.goto(`/${hash}`)
  // The shell renders before the screen's own content; specs then wait on
  // something screen-specific before taking the shot.
  await expect(page.locator('.app-content')).toBeVisible()
}

/** Waits for a screen's content to have settled, then captures the whole page. */
export async function expectScreenshot(
  page: Page,
  settled: Locator,
  name: string,
): Promise<void> {
  await expect(settled).toBeVisible()
  await expect(page).toHaveScreenshot(name, { fullPage: true })
}

/** Mirrors `screenToHash`'s card encoding: one variant letter per landscape, in LANDSCAPE_TYPES order. */
export function encodeCards(cards: ObjectifCardSelection): string {
  return LANDSCAPE_TYPES.map((type) => cards[type]).join('')
}

export const routes = {
  home: '#/',
  history: '#/history',
  setup: (playerIds: string[]) => `#/setup/${playerIds.join(',')}`,
  editSetup: (playerIds: string[], matchId: string) =>
    `#/setup/${playerIds.join(',')}/${matchId}`,
  newScore: (playerIds: string[], cards: ObjectifCardSelection) =>
    `#/score/${playerIds.join(',')}/-/${encodeCards(cards)}`,
  editScore: (playerIds: string[], matchId: string) =>
    `#/score/${playerIds.join(',')}/${matchId}`,
}
