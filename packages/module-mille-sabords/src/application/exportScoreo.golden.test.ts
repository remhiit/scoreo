import { assertRoundsSumToRanking } from '@scoreboards/module-api'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PartieTermineeSchema } from '../domain/modeles'
import { construireEnveloppeExport } from './exportScoreo'

/**
 * The differential half of the port.
 *
 * The Kotlin implementation under `legacy/1ksabord-kotlin` replays this exact
 * corpus and writes `expected-export.json`, guarded on its side by
 * `GoldenExportTest`. This test asserts the TypeScript port produces the same
 * bytes. Neither side can drift without the other going red — which is the only
 * way to be sure 416 lines of scoring rules were ported and not reinvented.
 */

const goldenDir = fileURLToPath(new URL('../../tests/golden/', import.meta.url))
const read = (name: string) => readFileSync(goldenDir + name, 'utf-8')

/** Frozen: `Date.now()` would make any golden comparison impossible. */
const EXPORTED_AT = 1767225600000

const corpus = PartieTermineeSchema.array().parse(JSON.parse(read('corpus.json')))

describe('construireEnveloppeExport', () => {
  it('produces byte-for-byte what the Kotlin oracle produces', () => {
    const produced = JSON.stringify(construireEnveloppeExport(corpus, EXPORTED_AT))

    expect(produced).toBe(read('expected-export.json').trim())
  })

  // What the byte comparison does not say out loud: the rounds have to add up.
  // Scoreo's import refuses a game whose detail contradicts its own score, and
  // the Skull Island penalties are exactly what makes that non-trivial.
  it('produces games whose rounds sum back to their ranking', () => {
    const envelope = construireEnveloppeExport(corpus, EXPORTED_AT)

    for (const game of envelope.games) {
      const ranking = game.ranking.map((entry) => ({
        playerId: entry.name,
        score: entry.score,
        rank: entry.rank,
      }))
      const rounds = game.details?.map((round, index) => ({
        label: `round ${index + 1}`,
        scores: round.scores.map((s) => ({ playerId: s.name, score: s.score })),
      }))

      expect(() => assertRoundsSumToRanking({ ranking, rounds })).not.toThrow()
    }
  })

  it('omits details entirely for a game recorded before per-round history', () => {
    const envelope = construireEnveloppeExport(corpus, EXPORTED_AT)
    const legacy = envelope.games.find((g) => g.id.startsWith('44444444'))

    expect(legacy).toBeDefined()
    expect(legacy).not.toHaveProperty('details')
  })

  // The clamp is per coup, not on the total: Ivy is driven below zero by a
  // Skull Island, restarts at zero, and scores again. Clamping the total would
  // have her repay the debt, and the rounds would stop summing to the ranking.
  it('never lets a clamped player repay their debt', () => {
    const envelope = construireEnveloppeExport(corpus, EXPORTED_AT)
    const game = envelope.games.find((g) => g.id.startsWith('55555555'))

    expect(game?.details?.map((r) => r.scores.map((s) => s.score))).toEqual([
      [0, 0],
      [300, 100],
    ])
    expect(game?.ranking.map((r) => r.score)).toEqual([300, 100])
  })
})
