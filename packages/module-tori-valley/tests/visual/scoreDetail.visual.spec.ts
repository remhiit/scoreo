import { test } from '@playwright/test'
import { openApp, expectScreenshot, routes } from './support/app'
import { MATCHES, MIXED_CARDS, PLAYERS } from './support/fixtures'

const PLAYER_IDS = ['player-akira', 'player-mei', 'player-hiroshi']

test.describe('ScoreDetail screen', () => {
  // Create mode: every counter at zero, totals at 0 VP.
  test('create mode, three players', async ({ page }) => {
    await openApp(page, routes.newScore(PLAYER_IDS, MIXED_CARDS), { players: PLAYERS })
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Akira — 0 VP' }),
      'score-detail-create.png',
    )
  })

  // A solo match is the narrowest layout the screen ever renders.
  test('create mode, single player', async ({ page }) => {
    await openApp(page, routes.newScore(['player-akira'], MIXED_CARDS), { players: PLAYERS })
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: 'Akira — 0 VP' }),
      'score-detail-create-solo.png',
    )
  })

  // Edit mode: inputs carry the stored result, so the totals and the Pinceau
  // and Parchemin selects are all non-default.
  test('edit mode, populated from a stored match', async ({ page }) => {
    await openApp(page, routes.editScore(PLAYER_IDS, 'match-one'), {
      players: PLAYERS,
      matches: MATCHES,
    })
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: /^Akira — \d+ VP$/ }),
      'score-detail-edit.png',
    )
  })
})
