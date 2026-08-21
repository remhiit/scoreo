import { expect, test } from '@playwright/test'

test('body uses the design system font stack, not a hardcoded one', async ({ page }) => {
  await page.goto('/')

  const bodyFontFamily = await page.evaluate('getComputedStyle(document.body).fontFamily')

  expect(bodyFontFamily).toContain('system-ui')
  expect(bodyFontFamily).toContain('Helvetica Neue')
})
