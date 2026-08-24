import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const fixturePath = fileURLToPath(new URL('./fixtures/import-sample.json', import.meta.url))

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('importing a JSON backup shows imported players and match', async ({ page }) => {
  await page.goto('/#/import')

  await page.locator('input[type="file"]').setInputFiles(fixturePath)

  await expect(page.locator('.import-preview-row', { hasText: 'Game:' })).toContainText('Uno E2E')
  await expect(page.locator('.import-preview-row', { hasText: 'Matches to import:' })).toContainText('1')

  await page.getByRole('button', { name: 'Import' }).click()

  await expect(page.getByText('1 imported')).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()

  await expect(page.getByText('Alice E2E', { exact: true })).toBeVisible()
  await expect(page.getByText('Bob E2E', { exact: true })).toBeVisible()

  await page.goto('/#/history')

  await expect(page.locator('.list-item-name', { hasText: 'Uno E2E' })).toBeVisible()

  await page.getByRole('button', { name: 'View details' }).click()

  await expect(page.getByText('Round 1')).toBeVisible()
  await expect(page.getByText('Round 2')).toBeVisible()
  await expect(page.locator('.rounds-detail-round', { hasText: 'Round 1' })).toContainText('30')
  await expect(page.locator('.rounds-detail-round', { hasText: 'Round 2' })).toContainText('12')
})
