import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

/**
 * Imports `e2e/fixtures/<fileName>` through the Import screen (pick the file,
 * Import, Done) and lands back on Home. Used to seed dated matches — stats and
 * trophies depend on match order and dates, which a run of clicks can't pin.
 */
export async function importFixture(page: Page, fileName: string): Promise<void> {
  const path = fileURLToPath(new URL(`../fixtures/${fileName}`, import.meta.url))
  await page.goto('/#/import')
  await page.getByLabel('Select a JSON file to import').setInputFiles(path)
  await page.getByRole('main').getByRole('button', { name: 'Import' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
}
