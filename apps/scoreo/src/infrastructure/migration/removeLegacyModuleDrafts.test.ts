import { beforeEach, describe, expect, it } from 'vitest'
import { removeLegacyModuleDrafts } from './removeLegacyModuleDrafts'

describe('removeLegacyModuleDrafts', () => {
  beforeEach(() => localStorage.clear())

  it('removes every scoreo_module_draft_ key and counts them', () => {
    localStorage.setItem('scoreo_module_draft_tori-valley', '{}')
    localStorage.setItem('scoreo_module_draft_mille-sabords', '{}')

    expect(removeLegacyModuleDrafts(localStorage)).toBe(2)
    expect(localStorage.length).toBe(0)
  })

  it('leaves keys without that prefix untouched', () => {
    localStorage.setItem('scoreo_match_draft', 'a')
    localStorage.setItem('scoreo_module_draft', 'b')
    localStorage.setItem('other_scoreo_module_draft_x', 'c')
    localStorage.setItem('scoreo_module_draft_x', 'd')

    expect(removeLegacyModuleDrafts(localStorage)).toBe(1)
    expect(localStorage.getItem('scoreo_match_draft')).toBe('a')
    expect(localStorage.getItem('scoreo_module_draft')).toBe('b')
    expect(localStorage.getItem('other_scoreo_module_draft_x')).toBe('c')
  })

  it('is idempotent and does nothing when no old key exists', () => {
    expect(removeLegacyModuleDrafts(localStorage)).toBe(0)
    localStorage.setItem('scoreo_module_draft_x', '1')
    expect(removeLegacyModuleDrafts(localStorage)).toBe(1)
    expect(removeLegacyModuleDrafts(localStorage)).toBe(0)
  })

  it('does not throw when storage throws', () => {
    const broken = {
      get length(): number {
        throw new Error('denied')
      },
    } as unknown as Storage
    expect(removeLegacyModuleDrafts(broken)).toBe(0)

    const stuck = {
      length: 1,
      key: () => 'scoreo_module_draft_x',
      removeItem: () => {
        throw new Error('denied')
      },
    } as unknown as Storage
    expect(removeLegacyModuleDrafts(stuck)).toBe(0)
  })
})
