import { expect, test, type Page } from '@playwright/test'
import { chooseGame, enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { openMenuEntry } from './helpers/navigation'
import { addPlayer } from './helpers/players'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

async function addGameType(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('Game name').fill(name)
  await page.getByRole('combobox', { name: 'Win condition' }).selectOption('HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Add game type' }).click()
  await expect(page.getByRole('main').getByText(name, { exact: true })).toBeVisible()
}

test('merging a duplicate game moves its matches onto the game kept', async ({ page }) => {
  await addPlayer(page, 'Alice')
  await addPlayer(page, 'Bob')

  await openMenuEntry(page, 'Games')
  await addGameType(page, 'Belote')
  await addGameType(page, 'belote')

  // The duplicate carries the history, as after an import that spelled the game differently.
  await openMenuEntry(page, 'Home')
  await startMatch(page, ['Alice', 'Bob'])
  await chooseGame(page, 'belote')
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRoundScore(page, { Alice: 10, Bob: 5 })
  await finishMatch(page)

  await openMenuEntry(page, 'Games')
  await page.getByRole('button', { name: 'Merge' }).click()
  const dialog = page.getByRole('dialog', { name: 'Merge games' })
  await expect(dialog.getByRole('button', { name: 'Merge' })).toBeDisabled()
  await dialog.getByRole('combobox', { name: 'Game to keep' }).selectOption({ label: 'Belote' })
  await dialog.getByRole('button', { name: 'belote', exact: true }).click()
  await expect(dialog).toContainText('1 match will move.')
  await dialog.getByRole('button', { name: 'Merge' }).click()

  await expect(dialog).toHaveCount(0)
  const main = page.getByRole('main')
  await expect(main.getByText('Belote', { exact: true })).toBeVisible()
  await expect(main.getByText('belote', { exact: true })).toHaveCount(0)

  // History only knows the game kept, and its match is listed under it.
  await openMenuEntry(page, 'History')
  const filter = page.getByRole('combobox', { name: 'Filter by game:' })
  await expect(filter.getByRole('option')).toHaveText(['All games', 'Belote'])
  await filter.selectOption({ label: 'Belote' })
  await expect(page.getByRole('main')).toContainText('Alice 10')
  await expect(page.getByRole('main')).toContainText('Bob 5')
})
