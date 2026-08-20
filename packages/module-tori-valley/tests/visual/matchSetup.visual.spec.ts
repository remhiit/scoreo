import { test } from '@playwright/test'
import { openApp, expectScreenshot, routes } from './support/app'
import { MATCHES, PLAYERS } from './support/fixtures'

const PLAYER_IDS = ['player-akira', 'player-mei', 'player-hiroshi']

test.describe('MatchSetup screen', () => {
  test('variant picker, default selection', async ({ page }) => {
    await openApp(page, routes.setup(PLAYER_IDS), { players: PLAYERS })
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Objectif cards' }),
      'match-setup-default.png',
    )
  })

  // Editing a stored match pre-fills the radios from that match's cards, so the
  // checked row is not the same one as above.
  test('variant picker, pre-filled from an existing match', async ({ page }) => {
    await openApp(page, routes.editSetup(PLAYER_IDS, 'match-one'), {
      players: PLAYERS,
      matches: MATCHES,
    })
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Objectif cards' }),
      'match-setup-prefilled.png',
    )
  })
})
