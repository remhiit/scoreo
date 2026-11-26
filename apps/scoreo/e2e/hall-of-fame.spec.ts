import { expect, test } from '@playwright/test'
import { importFixture } from './helpers/importFile'
import { openMenuEntry } from './helpers/navigation'

// fixtures/stats-sample.json — five dated "Belote Stats" matches (March–April 2023):
//   10 Mar Alice 30 – Bob 20, 12 Mar Alice 25 – Carol 15, 14 Mar Bob 40 – Alice 10,
//   5 Apr Alice 50 – Bob 35, 7 Apr Carol 22 – Bob 18.
// Fixed past dates keep every trophy below independent of the day the test runs.
test.use({ locale: 'en-US', timezoneId: 'Europe/Paris' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
})

test('every trophy shows an empty state before any match', async ({ page }) => {
  await openMenuEntry(page, 'Hall of Fame')

  const invincible = page.getByRole('region', { name: 'The Invincible' })
  await expect(invincible).toContainText('Longest winning streak of all time')
  await expect(invincible).toContainText('No record yet.')
  await expect(page.getByRole('region', { name: 'Monthly Champions' })).toContainText(
    'No record yet.',
  )
})

test('the hall of fame crowns the trophy holders after a few matches', async ({ page }) => {
  await importFixture(page, 'stats-sample.json')
  await openMenuEntry(page, 'Hall of Fame')

  const invincible = page.getByRole('region', { name: 'The Invincible' })
  await expect(invincible).toContainText(/Alice Stats\s*2$/)

  const collector = page.getByRole('region', { name: 'The Collector' })
  await expect(collector).toContainText(/Alice Stats\s*3$/)

  const breaker = page.getByRole('region', { name: 'Streak Breaker' })
  await expect(breaker).toContainText(/Bob Stats\s*Ended Alice Stats's streak\s*2$/)

  const record = page.getByRole('region', { name: 'Game Record' })
  await expect(record).toContainText(/Alice Stats\s*Belote Stats\s*50$/)

  // Fewer than 10 matches each: nobody qualifies as The Regular.
  await expect(page.getByRole('region', { name: 'The Regular' })).toContainText('No record yet.')

  // One group per completed month, most recent first; April is a tie.
  const champions = page.getByRole('region', { name: 'Monthly Champions' })
  await expect(champions).toContainText(
    /April 2023\s*Alice Stats\s*1\s*Carol Stats\s*1\s*March 2023\s*Alice Stats\s*2/,
  )
})
