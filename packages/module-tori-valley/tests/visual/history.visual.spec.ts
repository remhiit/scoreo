import { test } from '@playwright/test'
import { openApp, expectScreenshot, routes } from './support/app'
import { MATCHES, PLAYERS } from './support/fixtures'

test.describe('History screen', () => {
  test('empty state', async ({ page }) => {
    await openApp(page, routes.history)
    await expectScreenshot(
      page,
      page.getByText('No matches recorded yet.'),
      'history-empty.png',
    )
  })

  // Two matches, one of them decided on the Pinceau tie-break — covers the
  // winner row highlight and the 🏆 marker.
  test('with matches', async ({ page }) => {
    await openApp(page, routes.history, { players: PLAYERS, matches: MATCHES })
    await expectScreenshot(page, page.getByRole('button', { name: 'Export for Scoreo' }), 'history-with-matches.png')
  })

  // A match whose players were since deleted falls back to "Unknown player".
  test('with a match referencing a deleted player', async ({ page }) => {
    await openApp(page, routes.history, { players: [PLAYERS[0]], matches: [MATCHES[1]] })
    await expectScreenshot(
      page,
      page.getByText('Unknown player'),
      'history-unknown-player.png',
    )
  })
})
