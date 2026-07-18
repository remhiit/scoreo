import { describe, expect, it } from 'vitest'
import { extractClosedIssueNumbers } from './close-linked-issues.mjs'

describe('extractClosedIssueNumbers', () => {
  it('extracts a single "Closes #N" reference', () => {
    expect(extractClosedIssueNumbers('Some context.\n\nCloses #120')).toEqual([120])
  })

  it('is case-insensitive and accepts fix/resolve variants', () => {
    expect(extractClosedIssueNumbers('fixes #12')).toEqual([12])
    expect(extractClosedIssueNumbers('Resolved #34')).toEqual([34])
    expect(extractClosedIssueNumbers('CLOSE #56')).toEqual([56])
  })

  it('extracts a comma/and-separated list after one keyword', () => {
    expect(extractClosedIssueNumbers('Closes #10, #12 and #14')).toEqual([10, 12, 14])
  })

  it('dedupes repeated references', () => {
    expect(extractClosedIssueNumbers('Closes #10\n\nAlso closes #10')).toEqual([10])
  })

  it('ignores cross-repo references (owner/repo#N)', () => {
    expect(extractClosedIssueNumbers('Closes remhiit/other-repo#5')).toEqual([])
  })

  it('returns an empty list when there is no closing keyword', () => {
    expect(extractClosedIssueNumbers('See #120 for context.')).toEqual([])
    expect(extractClosedIssueNumbers(null)).toEqual([])
    expect(extractClosedIssueNumbers(undefined)).toEqual([])
  })
})
