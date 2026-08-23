import { expect, type Locator, type Page } from '@playwright/test'
import type { GameType } from '../../../src/domain/model/gameType'
import type { Match } from '../../../src/domain/model/match'
import type { Player } from '../../../src/domain/model/player'

/**
 * Scoreo's four Catppuccin flavors. Spelled out rather than imported from
 * `themeManager`, which reaches for `window` — this project compiles without
 * the DOM lib, like the rest of the Playwright harness.
 */
type Flavor = 'latte' | 'frappe' | 'macchiato' | 'mocha'

/**
 * The keys Scoreo's own adapters own. Duplicated here rather than imported,
 * because a renamed key must fail loudly: a seeded screen that silently falls
 * back to its empty state would quietly rewrite every baseline it appears in.
 */
const KEYS = {
  players: 'scoreo_players',
  gameTypes: 'scoreo_gametypes',
  matches: 'scoreo_matches',
  language: 'scoreo_lang',
  flavor: 'scoreo_flavor',
  accent: 'scoreo_accent',
} as const

export interface SeededState {
  players?: Player[]
  gameTypes?: GameType[]
  matches?: Match[]
  /** Pinned per test: an unset language would be detected from the browser and shift every label. */
  language?: 'en' | 'fr'
  /**
   * Pinned for the same reason, one step further: with no saved flavor Scoreo
   * picks one from `prefers-color-scheme`, so the host's chrome around the
   * module would follow the machine rather than the test.
   */
  flavor?: Flavor
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
    keys: KEYS,
    players: state.players ?? [],
    gameTypes: state.gameTypes ?? [],
    matches: state.matches ?? [],
    language: state.language ?? 'en',
    flavor: state.flavor ?? 'latte',
  }

  await page.addInitScript((s) => {
    localStorage.setItem(s.keys.players, JSON.stringify(s.players))
    localStorage.setItem(s.keys.gameTypes, JSON.stringify(s.gameTypes))
    localStorage.setItem(s.keys.matches, JSON.stringify(s.matches))
    localStorage.setItem(s.keys.language, s.language)
    localStorage.setItem(s.keys.flavor, s.flavor)
    localStorage.setItem(s.keys.accent, 'mauve')
  }, seeded)

  await page.goto(`/${hash}`)
}

/**
 * Waits for a screen's content to have settled, then captures the whole page —
 * the module and the host chrome around it.
 *
 * Scoreo scrolls its content inside the shell rather than the document, which is
 * why the visual projects run at a viewport tall enough to hold a whole screen:
 * see `playwright.visual.config.ts`.
 */
export async function expectScreenshot(page: Page, settled: Locator, name: string): Promise<void> {
  await expect(settled).toBeVisible()
  await expect(page).toHaveScreenshot(name, { fullPage: true })
}


export const routes = {
  /** `#/module/<moduleId>/<gameTypeId>/<playerIds>[/<matchId>]`, mirroring `screenToHash`. */
  module: (moduleId: string, gameTypeId: string, playerIds: string[], matchId?: string) => {
    const route = `#/module/${moduleId}/${gameTypeId}/${playerIds.join(',')}`
    return matchId === undefined ? route : `${route}/${matchId}`
  },
}
