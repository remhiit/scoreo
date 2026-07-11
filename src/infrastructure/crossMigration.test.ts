import { beforeEach, describe, expect, it } from 'vitest'
import { isUuid } from '../application/idGenerator'
import { LocalStorageGameTypeRepository } from './localStorage/localStorageGameTypeRepository'
import { LocalStorageMatchDraftRepository } from './localStorage/localStorageMatchDraftRepository'
import { LocalStorageMatchRepository } from './localStorage/localStorageMatchRepository'
import { LocalStoragePlayerRepository } from './localStorage/localStoragePlayerRepository'
import { loadSyncConfig } from './google/syncConfig'
import { readInitialAccent, readInitialFlavor } from '../ui/theme/themeManager'

/**
 * TS-081: replays a realistic real-world localStorage export captured from the
 * oldest documented Kotlin format (see doc/technical/migrations.md) through every
 * TS adapter, and asserts the full data survives with no loss — the only guarantee
 * existing users have that the cutover won't erase their local-first data.
 *
 * "Oldest documented format" combines, in the same snapshot, every backward-compat
 * case migrations.md describes: pre-archive players/game types (no `active` field),
 * pre-tie-break game types (no tieBreakRule/tieBreakCondition/tieBreakLabel), v1
 * matches (12-char ids, ISO date strings, no manualWinners/secondaryPlayerScores),
 * and the legacy `scoreo_theme` binary toggle instead of `scoreo_flavor`/`scoreo_accent`.
 * No `scoreo_match_draft` or `scoreo_sync_config` key exists yet either, since both
 * are newer than this snapshot.
 */
describe('cross-migration: real old-format localStorage export', () => {
  const OLD_PLAYERS_JSON = JSON.stringify([
    { id: 'p-alice', name: 'Alice' },
    { id: 'p-bob', name: 'Bob' },
    { id: 'p-carol', name: 'Carol' },
  ])

  const OLD_GAMETYPES_JSON = JSON.stringify([
    { id: 'gt-belote', name: 'Belote', winCondition: 'HIGHEST_SCORE' },
    { id: 'gt-tarot', name: 'Tarot', winCondition: 'LOWEST_SCORE' },
  ])

  const OLD_MATCHES_JSON = JSON.stringify([
    {
      id: 'a1b2c3d4e5f6',
      date: '2024-03-15',
      gameTypeId: 'gt-belote',
      playerScores: [
        { playerId: 'p-alice', score: 42 },
        { playerId: 'p-bob', score: 30 },
      ],
    },
    {
      id: 'z9y8x7w6v5u4',
      date: '2024-06-01',
      gameTypeId: 'gt-tarot',
      playerScores: [
        { playerId: 'p-alice', score: 10 },
        { playerId: 'p-bob', score: 20 },
        { playerId: 'p-carol', score: 15 },
      ],
    },
  ])

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('scoreo_players', OLD_PLAYERS_JSON)
    localStorage.setItem('scoreo_gametypes', OLD_GAMETYPES_JSON)
    localStorage.setItem('scoreo_matches', OLD_MATCHES_JSON)
    localStorage.setItem('scoreo_theme', 'dark')
    // scoreo_match_draft and scoreo_sync_config deliberately absent (newer than this snapshot)
  })

  it('migrates players with active defaulted to true, names and ids preserved', () => {
    const repo = new LocalStoragePlayerRepository()
    const players = repo.getAll(true)

    expect(players).toHaveLength(3)
    expect(players.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Carol'])
    expect(players.every((p) => p.active)).toBe(true)
    expect(players.map((p) => p.id)).toEqual(['p-alice', 'p-bob', 'p-carol'])
  })

  it('migrates game types with tie-break fields and active defaulted', () => {
    const repo = new LocalStorageGameTypeRepository()
    const gameTypes = repo.getAll(true)

    expect(gameTypes).toHaveLength(2)
    const belote = gameTypes.find((g) => g.id === 'gt-belote')
    expect(belote).toMatchObject({
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    const tarot = gameTypes.find((g) => g.id === 'gt-tarot')
    expect(tarot?.winCondition).toBe('LOWEST_SCORE')
    expect(gameTypes.every((g) => g.active)).toBe(true)
  })

  it('migrates matches: non-UUID ids replaced, ISO dates converted to epoch ms, scores preserved', () => {
    const repo = new LocalStorageMatchRepository()
    const matches = repo.getAll()

    expect(matches).toHaveLength(2)
    for (const match of matches) {
      expect(isUuid(match.id)).toBe(true)
      expect(typeof match.date).toBe('number')
      expect(match.manualWinners).toEqual([])
      expect(match.secondaryPlayerScores).toEqual([])
    }

    const beloteMatch = matches.find((m) => m.gameTypeId === 'gt-belote')
    expect(beloteMatch?.date).toBe(Date.UTC(2024, 2, 15))
    expect(beloteMatch?.playerScores).toEqual([
      { playerId: 'p-alice', score: 42 },
      { playerId: 'p-bob', score: 30 },
    ])

    const tarotMatch = matches.find((m) => m.gameTypeId === 'gt-tarot')
    expect(tarotMatch?.date).toBe(Date.UTC(2024, 5, 1))
    expect(tarotMatch?.playerScores).toHaveLength(3)
  })

  it('match migration is idempotent: a second getAll() does not change already-migrated ids again', () => {
    const repo = new LocalStorageMatchRepository()
    const first = repo.getAll()
    const firstIds = first.map((m) => m.id).sort()

    const repoAgain = new LocalStorageMatchRepository()
    const second = repoAgain.getAll()
    const secondIds = second.map((m) => m.id).sort()

    expect(secondIds).toEqual(firstIds)
  })

  it('migrates the legacy scoreo_theme binary toggle to a Catppuccin flavor, accent defaults to mauve', () => {
    expect(readInitialFlavor()).toBe('mocha')
    expect(readInitialAccent()).toBe('mauve')
    // scoreo_theme is read but never deleted (see migrations.md) — a rollback would still find it
    expect(localStorage.getItem('scoreo_theme')).toBe('dark')
  })

  it('match draft and sync config load their empty/default state when their keys never existed', () => {
    const draftRepo = new LocalStorageMatchDraftRepository()
    expect(draftRepo.load()).toBeUndefined()

    const syncConfig = loadSyncConfig()
    expect(syncConfig).toEqual({ email: '', lastSyncTimestamp: 0, lastSyncFileId: '' })
  })

  it('no data is lost across the full migration: every player, game type, and match round-trips', () => {
    const players = new LocalStoragePlayerRepository().getAll(true)
    const gameTypes = new LocalStorageGameTypeRepository().getAll(true)
    const matches = new LocalStorageMatchRepository().getAll()

    expect(players).toHaveLength(3)
    expect(gameTypes).toHaveLength(2)
    expect(matches).toHaveLength(2)

    const totalScoresBefore = JSON.parse(OLD_MATCHES_JSON).reduce(
      (sum: number, m: { playerScores: { score: number }[] }) =>
        sum + m.playerScores.reduce((s: number, ps: { score: number }) => s + ps.score, 0),
      0,
    )
    const totalScoresAfter = matches.reduce(
      (sum, m) => sum + m.playerScores.reduce((s, ps) => s + ps.score, 0),
      0,
    )
    expect(totalScoresAfter).toBe(totalScoresBefore)
  })
})
