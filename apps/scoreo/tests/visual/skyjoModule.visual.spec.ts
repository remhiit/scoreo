import { test, type Page } from '@playwright/test'
import { expectScreenshot, openApp, routes } from './support/app'
import {
  PLAYER_IDS,
  PLAYERS,
  SKYJO_FINISHED_ID,
  SKYJO_GAME_TYPE,
  SKYJO_IN_PROGRESS_ID,
  SKYJO_MATCHES,
} from './support/fixtures'

/**
 * Skyjo photographed where the players meet it: inside Scoreo, on the host's
 * own route, full-screen — the host's chrome is skipped there (#388).
 */

const route = (matchId?: string) => routes.module('skyjo', SKYJO_GAME_TYPE.id, PLAYER_IDS, matchId)

const seed = { players: PLAYERS, gameTypes: [SKYJO_GAME_TYPE], matches: SKYJO_MATCHES }

const scoreboard = (page: Page) => page.locator('.sj-table-wrap')

test.describe('Skyjo module', () => {
  test('a fresh game, on round 1', async ({ page }) => {
    await openApp(page, route(), seed)
    await expectScreenshot(page, scoreboard(page), 'skyjo-fresh.png')
  })

  // Two rounds in: every total non-zero, Mei's doubled round visible in the table.
  test('a game in progress, restored from a stored match', async ({ page }) => {
    await openApp(page, route(SKYJO_IN_PROGRESS_ID), seed)
    // The exact total, not a loose \d+: a grid that failed to restore renders a
    // perfectly plausible empty scoreboard, and the baseline would bless it.
    await expectScreenshot(page, page.getByText('27', { exact: true }), 'skyjo-in-progress.png')
  })

  // Mei's fifth round doubles her past 100, so the module renders its end
  // screen rather than the playing one.
  test('the end screen, with the final standings', async ({ page }) => {
    await openApp(page, route(SKYJO_FINISHED_ID), seed)
    // The winner's exact total, for the same reason: a history that failed to
    // restore would render a plausible end screen with everyone at zero.
    await expectScreenshot(page, page.getByText('38 points'), 'skyjo-finished.png')
  })
})

/**
 * The module's palette is a single dark one of its own — it is not derived
 * from `prefers-color-scheme`. The point of this baseline is the opposite of
 * Torī's: to prove the module keeps that palette while the *host* around it
 * turns dark.
 */
test.describe('Skyjo module, dark host', () => {
  test.use({ colorScheme: 'dark' })

  test('a game in progress', async ({ page }) => {
    await openApp(page, route(SKYJO_IN_PROGRESS_ID), { ...seed, flavor: 'mocha' })
    await expectScreenshot(page, page.getByText('27', { exact: true }), 'skyjo-in-progress-dark.png')
  })
})
