import { describe, expect, it } from 'vitest'
import { defaultObjectifCardSelection } from '../../domain/model/landscape'
import { matchSetupReducer } from './matchSetupReducer'
import { buildInitialMatchSetupState } from './matchSetupTypes'

describe('matchSetupReducer', () => {
  it('starts with every landscape on variant A', () => {
    const state = buildInitialMatchSetupState(['p1'])

    expect(state.selection).toEqual(defaultObjectifCardSelection())
  })

  it('starts from an existing selection when one is given', () => {
    const existing = { ...defaultObjectifCardSelection(), water: 'C' } as const

    expect(buildInitialMatchSetupState(['p1'], existing).selection).toEqual(existing)
  })

  it('selects a variant for one landscape', () => {
    const state = buildInitialMatchSetupState(['p1'])

    const next = matchSetupReducer(state, {
      type: 'selectVariant',
      landscape: 'bamboo',
      variant: 'C',
    })

    expect(next.selection.bamboo).toBe('C')
  })

  it('leaves the other landscapes untouched', () => {
    const state = buildInitialMatchSetupState(['p1'])

    const next = matchSetupReducer(state, {
      type: 'selectVariant',
      landscape: 'mountain',
      variant: 'B',
    })

    expect(next.selection).toEqual({ ...defaultObjectifCardSelection(), mountain: 'B' })
  })

  it('replaces the variant rather than accumulating, since only one card per landscape is dealt', () => {
    const state = buildInitialMatchSetupState(['p1'])

    const next = ['B', 'C', 'A'].reduce(
      (acc, variant) =>
        matchSetupReducer(acc, {
          type: 'selectVariant',
          landscape: 'village',
          variant: variant as 'A' | 'B' | 'C',
        }),
      state,
    )

    expect(next.selection.village).toBe('A')
  })

  it('keeps the players it was built with', () => {
    const state = buildInitialMatchSetupState(['p1', 'p2'])

    expect(state.playerIds).toEqual(['p1', 'p2'])
  })
})
