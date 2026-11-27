import { expect, test } from '@playwright/test'
import { openMenuEntry } from './helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('the theme picked is applied and kept after a reload', async ({ page }) => {
  await openMenuEntry(page, 'Theme')
  let dialog = page.getByRole('dialog', { name: 'Theme' })
  const flavors = dialog.getByRole('group', { name: 'Flavor' })
  const accents = dialog.getByRole('group', { name: 'Accent' })

  await flavors.getByRole('button', { name: 'Frappe' }).click()
  await accents.getByRole('button', { name: 'peach' }).click()
  await expect(flavors.getByRole('button', { name: 'Frappe' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(accents.getByRole('button', { name: 'peach' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await dialog.getByRole('button', { name: 'Close' }).last().click()
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate('document.documentElement.dataset.theme')).toBe('frappe')

  await page.reload()

  expect(await page.evaluate('document.documentElement.dataset.theme')).toBe('frappe')
  expect(await page.evaluate('document.documentElement.dataset.accent')).toBe('peach')
  await openMenuEntry(page, 'Theme')
  dialog = page.getByRole('dialog', { name: 'Theme' })
  await expect(
    dialog.getByRole('group', { name: 'Flavor' }).getByRole('button', { name: 'Frappe' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    dialog.getByRole('group', { name: 'Flavor' }).getByRole('button', { name: 'Latte' }),
  ).toHaveAttribute('aria-pressed', 'false')
  await expect(
    dialog.getByRole('group', { name: 'Accent' }).getByRole('button', { name: 'peach' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    dialog.getByRole('group', { name: 'Accent' }).getByRole('button', { name: 'mauve' }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('the language picked translates the app and is kept after a reload', async ({ page }) => {
  await openMenuEntry(page, 'Language')
  const dialog = page.getByRole('dialog', { name: 'Language' })
  await dialog.getByRole('button', { name: 'French' }).click()

  // The picker itself switches language at once.
  const dialogFr = page.getByRole('dialog', { name: 'Langue' })
  await expect(dialogFr.getByRole('button', { name: 'Français' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await dialogFr.getByRole('button', { name: 'Fermer' }).last().click()
  await expect(page.getByPlaceholder('Nom du joueur')).toBeVisible()

  await page.reload()

  await expect(page.getByPlaceholder('Nom du joueur')).toBeVisible()
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('button', { name: 'Accueil', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Statistiques', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Langue', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Langue' }).getByRole('button', { name: 'Français' }),
  ).toHaveAttribute('aria-pressed', 'true')
})
