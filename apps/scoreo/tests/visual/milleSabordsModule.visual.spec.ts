import { test, type Page } from '@playwright/test'
import { expectScreenshot, openApp, routes } from './support/app'
import {
  PLAYER_IDS,
  PLAYERS,
  SABORDS_FINISHED_ID,
  SABORDS_GAME_TYPE,
  SABORDS_IN_PROGRESS_ID,
  SABORDS_MATCHES,
} from './support/fixtures'

/**
 * 1000 Sabords photographed where the players meet it: inside Scoreo, on the
 * host's own route, full-screen — the host's chrome is skipped there (#388).
 *
 * This is the densest screen either module renders — six dice counters, two
 * tabs, a scoreboard and an end screen — and until #361 nothing looked at it.
 * The static guard (`scripts/check-module-styles.mjs`) proves no class name is
 * shared with the host; it cannot prove the result is legible.
 */

const route = (matchId?: string) =>
  routes.module('mille-sabords', SABORDS_GAME_TYPE.id, PLAYER_IDS, matchId)

const seed = { players: PLAYERS, gameTypes: [SABORDS_GAME_TYPE], matches: SABORDS_MATCHES }

/** The scoreboard, present on every playing screen. */
const scoreboard = (page: Page) => page.getByRole('region', { name: 'Tableau de bord' })

test.describe('1000 Sabords module', () => {
  test('a fresh game, on the calculator tab', async ({ page }) => {
    await openApp(page, route(), seed)
    await expectScreenshot(page, scoreboard(page), 'sabords-calc-empty.png')
  })

  test('the quick-entry tab', async ({ page }) => {
    await openApp(page, route(), seed)
    await page.getByRole('tab', { name: /Saisie rapide/ }).click()
    await expectScreenshot(
      page,
      page.getByRole('tabpanel', { name: 'Saisie rapide' }),
      'sabords-manual.png',
    )
  })

  // Four moves in: every total non-zero, Mei on turn, round 2 badge.
  test('a game in progress, restored from a stored match', async ({ page }) => {
    await openApp(page, route(SABORDS_IN_PROGRESS_ID), seed)
    // The exact total, not a loose \d+: a grid that failed to restore renders a
    // perfectly plausible empty scoreboard, and the baseline would bless it.
    await expectScreenshot(page, page.getByText('4500', { exact: true }), 'sabords-in-progress.png')
  })

  // Akira crossed 6000 on the seventh move and the round completed, so the
  // module renders its end screen rather than the playing one.
  test('the end screen, with the final standings', async ({ page }) => {
    await openApp(page, route(SABORDS_FINISHED_ID), seed)
    // The winner's exact total, for the same reason: a history that failed to
    // restore would render a plausible end screen with everyone at zero.
    await expectScreenshot(page, page.getByText('6500 points'), 'sabords-finished.png')
  })
})

/**
 * The module's palette is a single dark one of its own — it is not derived from
 * `prefers-color-scheme`. The point of this baseline is the opposite of Torī's:
 * to prove the module keeps that palette while the *host* around it turns dark.
 */
test.describe('1000 Sabords module, dark host', () => {
  test.use({ colorScheme: 'dark' })

  test('a game in progress', async ({ page }) => {
    await openApp(page, route(SABORDS_IN_PROGRESS_ID), { ...seed, flavor: 'mocha' })
    await expectScreenshot(page, page.getByText('4500', { exact: true }), 'sabords-in-progress-dark.png')
  })
})
