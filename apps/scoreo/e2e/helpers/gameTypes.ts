import type { Page } from '@playwright/test'
import type { ScoringMode, TieBreakRule, WinCondition } from '../../src/domain/model/enums'
import { openMenuEntry } from './navigation'

export interface CreateGameTypeOptions {
  /** The Home "Select a game" inline form has no tie-break field, so a rule other than the default (NONE) goes through the Games screen's full form instead. */
  tieBreakRule?: TieBreakRule
}

/**
 * Creates a game type. With no options, creates it inline from the
 * already-open "Select a game" modal (opened via the Home "New Match"
 * button) — the created game type ends up selected in the modal's dropdown.
 * With `tieBreakRule`, navigates to the Games screen instead (the only form
 * exposing tie-break configuration) and back to Home once done.
 */
export async function createGameType(
  page: Page,
  name: string,
  winCondition: WinCondition,
  options: CreateGameTypeOptions = {},
): Promise<void> {
  if (options.tieBreakRule === undefined) {
    const dialog = page.getByRole('dialog', { name: 'Select a game' })
    await dialog.getByRole('button', { name: 'Add new game' }).click()
    await dialog.getByPlaceholder('Game name').fill(name)
    await dialog.getByRole('combobox', { name: 'Win condition' }).selectOption(winCondition)
    await dialog.getByRole('button', { name: 'Add game' }).click()
    return
  }

  await openMenuEntry(page, 'Games')
  await addGameType(page, name, winCondition, { tieBreakRule: options.tieBreakRule })
  await openMenuEntry(page, 'Home')
}

export interface GameTypeFormOptions {
  scoringMode?: ScoringMode
  tieBreakRule?: TieBreakRule
  /** Only shown once `tieBreakRule` is SECONDARY_SCORE. */
  tieBreakCondition?: WinCondition
  /** Only shown once `tieBreakRule` is SECONDARY_SCORE. */
  tieBreakQuestion?: string
}

/**
 * Fills the Games screen's "add game type" form (already open) without
 * submitting it, so a spec can assert on the form before `addGameType`'s
 * final click. Fields left out of `options` keep their default.
 */
export async function fillGameTypeForm(
  page: Page,
  name: string,
  winCondition: WinCondition,
  options: GameTypeFormOptions = {},
): Promise<void> {
  await page.getByPlaceholder('Game name').fill(name)
  await page.getByRole('combobox', { name: 'Win condition' }).selectOption(winCondition)
  if (options.scoringMode !== undefined) {
    await page.getByRole('combobox', { name: 'Scoring' }).selectOption(options.scoringMode)
  }
  if (options.tieBreakRule !== undefined) {
    await page.getByRole('combobox', { name: 'Tie-break rule' }).selectOption(options.tieBreakRule)
  }
  if (options.tieBreakCondition !== undefined) {
    await page
      .getByRole('combobox', { name: 'Tie break condition:' })
      .selectOption(options.tieBreakCondition)
  }
  if (options.tieBreakQuestion !== undefined) {
    await page.getByRole('textbox', { name: 'Tie break question:' }).fill(options.tieBreakQuestion)
  }
}

/** Adds a game type from the Games screen (already open): fills its form, then submits it. */
export async function addGameType(
  page: Page,
  name: string,
  winCondition: WinCondition,
  options: GameTypeFormOptions = {},
): Promise<void> {
  await fillGameTypeForm(page, name, winCondition, options)
  await submitGameTypeForm(page)
}

/** Submits the Games screen's "add game type" form. */
export async function submitGameTypeForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add game type' }).click()
}

/**
 * Archives the named game type from the Games screen: clicks its Delete
 * (trash) icon, then confirms in the "Archive <name>?" modal.
 */
export async function archiveGameType(page: Page, name: string): Promise<void> {
  const row = page.locator('.sc-row', { hasText: name })
  await row.getByRole('button', { name: 'Delete' }).click()
  await page
    .getByRole('dialog', { name: `Archive ${name}?` })
    .getByRole('button', { name: 'Archive' })
    .click()
}
