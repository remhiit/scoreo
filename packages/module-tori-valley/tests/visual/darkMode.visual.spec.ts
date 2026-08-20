import { test } from '@playwright/test'
import { openApp, expectScreenshot, routes } from './support/app'
import { MATCHES, PLAYERS } from './support/fixtures'

/**
 * The stylesheet has a `prefers-color-scheme: dark` block, so every colour it
 * overrides is a second layout that ships and can regress on its own. Covered
 * on the two densest screens rather than on all of them — the palette is shared,
 * so a broken token shows up here first.
 */
test.describe('Dark colour scheme', () => {
  test.use({ colorScheme: 'dark' })

  test('home with players', async ({ page }) => {
    await openApp(page, routes.home, { players: PLAYERS })
    await expectScreenshot(page, page.getByText('Hiroshi'), 'dark-home.png')
  })

  test('score detail, edit mode', async ({ page }) => {
    await openApp(page, routes.editScore(['player-akira', 'player-mei', 'player-hiroshi'], 'match-one'), {
      players: PLAYERS,
      matches: MATCHES,
    })
    await expectScreenshot(
      page,
      page.getByRole('heading', { name: /^Akira — \d+ VP$/ }),
      'dark-score-detail-edit.png',
    )
  })
})
