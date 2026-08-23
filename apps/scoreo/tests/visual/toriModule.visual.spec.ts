import { test, type Page } from '@playwright/test'
import { expectScreenshot, openApp, routes } from './support/app'
import { MATCH_ONE_ID, MATCHES, PLAYER_IDS, PLAYERS, TORI_GAME_TYPE } from './support/fixtures'

/**
 * Torī Valley photographed where the players actually meet it: inside Scoreo,
 * on the host's own route, with the host's chrome around it.
 *
 * The module keeps two steps of its own — deal the Objectif cards, then enter
 * the scores — so the scoring screen is reached by confirming the first, not by
 * a route of its own. That click is the only one in the suite.
 */

const newMatch = routes.module('tori-valley', TORI_GAME_TYPE.id, PLAYER_IDS)
const editMatch = routes.module('tori-valley', TORI_GAME_TYPE.id, PLAYER_IDS, MATCH_ONE_ID)

const seed = { players: PLAYERS, gameTypes: [TORI_GAME_TYPE], matches: MATCHES }

/** Leaves the module's card-dealing step for its scoring screen. */
async function enterScoring(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start match' }).click()
}


test.describe('Torī Valley module', () => {
  test('card dealing, default selection', async ({ page }) => {
    await openApp(page, newMatch, seed)
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Objectif cards' }),
      'tori-setup-default.png',
    )
  })

  // Reopening a match pre-fills the radios from the cards stored in its
  // `moduleData`, so the checked row is not the same one as above.
  test('card dealing, pre-filled from a stored match', async ({ page }) => {
    await openApp(page, editMatch, seed)
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Objectif cards' }),
      'tori-setup-prefilled.png',
    )
  })

  // Create mode: every counter at zero, totals at 0 VP.
  test('scoring, three players from scratch', async ({ page }) => {
    await openApp(page, newMatch, seed)
    await enterScoring(page)
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Akira — 0 VP' }),
      'tori-score-create.png',
    )
  })

  // Edit mode: the inputs carry the stored result, so the totals and the
  // Pinceau and Parchemin selects are all non-default.
  test('scoring, populated from a stored match', async ({ page }) => {
    await openApp(page, editMatch, seed)
    await enterScoring(page)
    // The exact total, not a loose \d+: a grid that failed to restore renders a
    // perfectly plausible "Akira — 0 VP", and the baseline would bless it.
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Akira — 21 VP' }),
      'tori-score-edit.png',
    )
  })
})

/**
 * The module's stylesheet carries a `prefers-color-scheme: dark` block, so every
 * colour it overrides is a second layout that ships and can regress on its own.
 * Held on the densest screen only — the palette is shared, so a broken token
 * shows up here first. Scoreo's own flavor is pinned dark alongside it, which is
 * what a player using the module at night actually sees.
 */
test.describe('Torī Valley module, dark colour scheme', () => {
  test.use({ colorScheme: 'dark' })

  test('scoring, populated from a stored match', async ({ page }) => {
    await openApp(page, editMatch, { ...seed, flavor: 'mocha' })
    await enterScoring(page)
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Akira — 21 VP' }),
      'tori-score-edit-dark.png',
    )
  })
})
