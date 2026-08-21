import { test } from '@playwright/test'
import { openApp, expectScreenshot, routes } from './support/app'
import { PLAYERS, PLAYERS_WITH_LONG_NAME } from './support/fixtures'

test.describe('Home screen', () => {
  test('empty state', async ({ page }) => {
    await openApp(page, routes.home)
    await expectScreenshot(page, page.getByText('No players yet — add some above.'), 'home-empty.png')
  })

  test('with players', async ({ page }) => {
    await openApp(page, routes.home, { players: PLAYERS })
    await expectScreenshot(page, page.getByText('Hiroshi'), 'home-with-players.png')
  })

  // A player row holds a checkbox, the name and a delete button; a name that
  // stops being constrained pushes that button off a phone's viewport.
  test('with an overlong player name', async ({ page }) => {
    await openApp(page, routes.home, { players: PLAYERS_WITH_LONG_NAME })
    await expectScreenshot(
      page,
      page.getByText('Bartholomew Featherstonehaugh'),
      'home-long-player-name.png',
    )
  })

  test('in French', async ({ page }) => {
    await openApp(page, routes.home, { players: PLAYERS, language: 'fr' })
    await expectScreenshot(page, page.getByText('Hiroshi'), 'home-french.png')
  })
})
