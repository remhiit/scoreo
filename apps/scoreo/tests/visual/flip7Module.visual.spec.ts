import { test } from '@playwright/test'
import { expectScreenshot, openApp, routes } from './support/app'
import {
  FLIP7_FINISHED_ID,
  FLIP7_GAME_TYPE,
  FLIP7_IN_PROGRESS_ID,
  FLIP7_MATCHES,
  PLAYER_IDS,
  PLAYERS,
} from './support/fixtures'

/**
 * Flip 7 photographed where the players meet it: inside Scoreo, on the host's
 * own route, full-screen — the host's chrome is skipped there (#388).
 */

const route = (matchId?: string) => routes.module('flip-7', FLIP7_GAME_TYPE.id, PLAYER_IDS, matchId)

const seed = { players: PLAYERS, gameTypes: [FLIP7_GAME_TYPE], matches: FLIP7_MATCHES }

test.describe('Flip 7 module', () => {
  test('a fresh game, on round 1', async ({ page }) => {
    await openApp(page, route(), seed)
    await expectScreenshot(
      page,
      page.getByText("Aucune manche jouée pour l'instant."),
      'flip7-fresh.png',
    )
  })

  // Two rounds in: a Flip 7 and a bust visible in the round log.
  test('a game in progress, restored from a stored match', async ({ page }) => {
    await openApp(page, route(FLIP7_IN_PROGRESS_ID), seed)
    // The exact total, not a loose \d+: a log that failed to restore renders a
    // perfectly plausible fresh game, and the baseline would bless it.
    await expectScreenshot(page, page.getByText('69 pts'), 'flip7-in-progress.png')
  })

  // Akira's fifth round takes him alone past 200: the end screen.
  test('the end screen, with the final standings', async ({ page }) => {
    await openApp(page, route(FLIP7_FINISHED_ID), seed)
    await expectScreenshot(page, page.getByText('202 points'), 'flip7-finished.png')
  })
})

/** The module wears Scoreo's look, so it must follow the host into its dark flavour. */
test.describe('Flip 7 module, dark host', () => {
  test.use({ colorScheme: 'dark' })

  test('a game in progress', async ({ page }) => {
    await openApp(page, route(FLIP7_IN_PROGRESS_ID), { ...seed, flavor: 'mocha' })
    await expectScreenshot(page, page.getByText('69 pts'), 'flip7-in-progress-dark.png')
  })
})
