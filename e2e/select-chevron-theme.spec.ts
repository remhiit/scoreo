import { expect, test } from '@playwright/test'

const CHEVRON_BACKGROUND_COLOR = "getComputedStyle(document.querySelector('.select-chevron'), '::after').backgroundColor"

const TEXT_MUTED_COLOR = `(() => {
  const probe = document.createElement('div')
  probe.style.backgroundColor = 'var(--text-muted)'
  document.body.appendChild(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
})()`

test('select chevron color follows --text-muted across theme flavors', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()

  await page.evaluate("document.documentElement.setAttribute('data-theme', 'latte')")
  const latteChevron = await page.evaluate(CHEVRON_BACKGROUND_COLOR)
  expect(latteChevron).toBe(await page.evaluate(TEXT_MUTED_COLOR))

  await page.evaluate("document.documentElement.setAttribute('data-theme', 'mocha')")
  const mochaChevron = await page.evaluate(CHEVRON_BACKGROUND_COLOR)
  expect(mochaChevron).toBe(await page.evaluate(TEXT_MUTED_COLOR))

  expect(latteChevron).not.toBe(mochaChevron)
})
