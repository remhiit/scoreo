import { expect, test } from '@playwright/test'
import { addGameType, fillGameTypeForm, submitGameTypeForm } from './helpers/gameTypes'
import { openMenuEntry } from './helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('creating a game with its rules lists it and keeps every rule', async ({ page }) => {
  await openMenuEntry(page, 'Games')
  await expect(page.getByText('No game types yet. Add one.')).toBeVisible()

  await addGameType(page, 'Tarot', 'LOWEST_SCORE', {
    scoringMode: 'ROUNDS_WON',
    tieBreakRule: 'SECONDARY_SCORE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakQuestion: 'Number of cards',
  })

  const main = page.getByRole('main')
  await expect(main.getByText('Tarot', { exact: true })).toBeVisible()

  await main.getByRole('button', { name: 'View details' }).click()
  const detail = page.getByRole('dialog', { name: 'Tarot' })
  await expect(detail).toContainText('Win condition')
  await expect(detail).toContainText('Lowest score')
  await expect(detail).toContainText('Secondary score')
  await expect(detail).toContainText('Highest score')
  await expect(detail).toContainText('Number of cards')

  // The scoring mode isn't part of the detail: the edit form shows it.
  await detail.getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit Tarot' })
  await expect(edit.getByRole('combobox', { name: 'Win condition' })).toHaveValue('LOWEST_SCORE')
  await expect(edit.getByRole('combobox', { name: 'Scoring' })).toHaveValue('ROUNDS_WON')
  await expect(edit.getByRole('combobox', { name: 'Tie-break rule' })).toHaveValue(
    'SECONDARY_SCORE',
  )
})

test('a game with a manual win condition offers no scoring choice', async ({ page }) => {
  await openMenuEntry(page, 'Games')

  await fillGameTypeForm(page, 'Custom', 'MANUAL')
  await expect(page.getByRole('combobox', { name: 'Scoring' })).toHaveCount(0)
  await submitGameTypeForm(page)

  await page.getByRole('main').getByRole('button', { name: 'View details' }).click()
  const detail = page.getByRole('dialog', { name: 'Custom' })
  await expect(detail).toContainText('Manual')
  await detail.getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit Custom' })
  await expect(edit.getByRole('combobox', { name: 'Win condition' })).toHaveValue('MANUAL')
  await expect(edit.getByRole('combobox', { name: 'Scoring' })).toHaveCount(0)
})
