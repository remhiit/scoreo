import { describe, expect, it } from 'vitest'
import { isUuid } from '../../application/idGenerator'
import { migrateMatches } from './migrateMatches'

describe('migrateMatches', () => {
  const fixedId = '550e8400-e29b-41d4-a716-446655440000'

  it('null when JSON is invalid', () => {
    expect(migrateMatches('not json', () => fixedId)).toBeNull()
  })

  it('null when root is not an array', () => {
    expect(migrateMatches('{"key": "value"}', () => fixedId)).toBeNull()
  })

  it('null when no migration needed', () => {
    const input = `[{"id": "${fixedId}", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    expect(migrateMatches(input, () => fixedId)).toBeNull()
  })

  it('migrates string date to epoch millis', () => {
    const input = `[{"id": "${fixedId}", "date": "2024-01-15", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    const result = migrateMatches(input, () => fixedId)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result as string)
    expect(typeof parsed[0].date).toBe('number')
    expect(parsed[0].date).toBe(1705276800000)
  })

  it('replaces non-uuid id with generated id', () => {
    const input = `[{"id": "old-id-123", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    const result = migrateMatches(input, () => fixedId)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result as string)
    expect(parsed[0].id).toBe(fixedId)
  })

  it('migrates both date and id in same record', () => {
    const input = `[{"id": "old", "date": "2024-06-01", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    const result = migrateMatches(input, () => fixedId)
    const parsed = JSON.parse(result as string)[0]
    expect(parsed.id).toBe(fixedId)
    expect(parsed.date).toBe(1717200000000)
  })

  it('keeps valid uuid unchanged', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'
    const input = `[{"id": "${validUuid}", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    const result = migrateMatches(input, () => 'should-not-be-used')
    expect(result).toBeNull()
  })

  it('migrates multiple records independently', () => {
    const input = `[
      {"id": "old-a", "date": "2024-01-01", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []},
      {"id": "${fixedId}", "date": 2000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}
    ]`
    let call = 0
    const result = migrateMatches(input, () => (call++ === 0 ? 'new-uuid' : 'unused'))
    const arr = JSON.parse(result as string)
    expect(arr).toHaveLength(2)
    expect(arr[0].id).toBe('new-uuid')
    expect(arr[1].id).toBe(fixedId)
  })

  it('handles empty array', () => {
    expect(migrateMatches('[]', () => fixedId)).toBeNull()
  })

  it('uppercase uuid is recognized as valid', () => {
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('mixed case uuid is recognized as valid', () => {
    expect(isUuid('550e8400-e29B-41D4-A716-446655440000')).toBe(true)
  })

  it('invalid date string left unchanged', () => {
    const input = `[{"id": "${fixedId}", "date": "not-a-date", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    expect(migrateMatches(input, () => fixedId)).toBeNull()
  })

  it('empty date string left unchanged', () => {
    const input = `[{"id": "${fixedId}", "date": "", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    expect(migrateMatches(input, () => fixedId)).toBeNull()
  })

  it('migration is idempotent after date migration', () => {
    const input = `[{"id": "${fixedId}", "date": "2024-01-15", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    const first = migrateMatches(input, () => 'new-id')
    expect(first).not.toBeNull()
    const second = migrateMatches(first as string, () => 'another-id')
    expect(second).toBeNull()
  })

  it('migration is idempotent after id migration', () => {
    const input = `[{"id": "old-id", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]`
    const first = migrateMatches(input, () => fixedId)
    expect(first).not.toBeNull()
    const second = migrateMatches(first as string, () => 'another-id')
    expect(second).toBeNull()
  })

  it('extra fields in playerScores are preserved through migration', () => {
    const input = `[{"id": "old-id", "date": 1000000, "gameTypeId": "gt1", "playerScores": [{"playerId": "p1", "score": 10, "extra": "keep"}]}]`
    const result = migrateMatches(input, () => fixedId)
    const parsed = JSON.parse(result as string)[0]
    expect(parsed.playerScores[0].extra).toBe('keep')
  })

  it('migration preserves manualWinners', () => {
    const input = `[{"id": "old-id", "date": 1000000, "gameTypeId": "gt1", "playerScores": [{"playerId": "p1", "score": 10}], "manualWinners": ["p1"]}]`
    const result = migrateMatches(input, () => fixedId)
    const parsed = JSON.parse(result as string)[0]
    expect(parsed.manualWinners[0]).toBe('p1')
  })

  it('records missing id field are still migrated for date', () => {
    const input = `[{"date": "2024-01-15", "gameTypeId": "gt1", "playerScores": []}]`
    const result = migrateMatches(input, () => fixedId)
    const parsed = JSON.parse(result as string)[0]
    expect(parsed.date).toBe(1705276800000)
  })
})
