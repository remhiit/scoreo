import { describe, expect, it } from 'vitest'
import { assertRoundsSumToRanking } from './assertRoundsSumToRanking'
import type { ModuleMatchResult } from './matchResult'

function result(partial: Partial<ModuleMatchResult>): ModuleMatchResult {
  return { ranking: [], ...partial }
}

describe('assertRoundsSumToRanking', () => {
  describe('accepts', () => {
    it('a result with no rounds at all', () => {
      expect(() =>
        assertRoundsSumToRanking(result({ ranking: [{ playerId: 'p1', score: 42, rank: 1 }] })),
      ).not.toThrow()
    })

    it('a single round matching the ranking', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [
              { playerId: 'p1', score: 10, rank: 1 },
              { playerId: 'p2', score: 4, rank: 2 },
            ],
            rounds: [
              {
                label: 'Round 1',
                scores: [
                  { playerId: 'p1', score: 10 },
                  { playerId: 'p2', score: 4 },
                ],
              },
            ],
          }),
        ),
      ).not.toThrow()
    })

    it('several rounds adding up to the ranking', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [
              { playerId: 'p1', score: 15, rank: 1 },
              { playerId: 'p2', score: 9, rank: 2 },
            ],
            rounds: [
              {
                label: 'Round 1',
                scores: [
                  { playerId: 'p1', score: 10 },
                  { playerId: 'p2', score: 4 },
                ],
              },
              {
                label: 'Round 2',
                scores: [
                  { playerId: 'p1', score: 5 },
                  { playerId: 'p2', score: 5 },
                ],
              },
            ],
          }),
        ),
      ).not.toThrow()
    })

    it('negative round scores', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [{ playerId: 'p1', score: -3, rank: 1 }],
            rounds: [
              { label: 'Round 1', scores: [{ playerId: 'p1', score: 5 }] },
              { label: 'Round 2', scores: [{ playerId: 'p1', score: -8 }] },
            ],
          }),
        ),
      ).not.toThrow()
    })

    it('a player who sat a round out', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [
              { playerId: 'p1', score: 15, rank: 1 },
              { playerId: 'p2', score: 4, rank: 2 },
            ],
            rounds: [
              {
                label: 'Round 1',
                scores: [
                  { playerId: 'p1', score: 10 },
                  { playerId: 'p2', score: 4 },
                ],
              },
              { label: 'Round 2', scores: [{ playerId: 'p1', score: 5 }] },
            ],
          }),
        ),
      ).not.toThrow()
    })

    it('a player scoring nothing anywhere, ranked at zero', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [
              { playerId: 'p1', score: 10, rank: 1 },
              { playerId: 'p2', score: 0, rank: 2 },
            ],
            rounds: [{ label: 'Round 1', scores: [{ playerId: 'p1', score: 10 }] }],
          }),
        ),
      ).not.toThrow()
    })

    it('an empty round', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [{ playerId: 'p1', score: 0, rank: 1 }],
            rounds: [{ label: 'Round 1', scores: [] }],
          }),
        ),
      ).not.toThrow()
    })

    it('an empty result', () => {
      expect(() => assertRoundsSumToRanking(result({ rounds: [] }))).not.toThrow()
    })

    it('tied players sharing a rank', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [
              { playerId: 'p1', score: 7, rank: 1 },
              { playerId: 'p2', score: 7, rank: 1 },
            ],
            rounds: [
              {
                label: 'Round 1',
                scores: [
                  { playerId: 'p1', score: 7 },
                  { playerId: 'p2', score: 7 },
                ],
              },
            ],
          }),
        ),
      ).not.toThrow()
    })
  })

  describe('rejects', () => {
    it('rounds summing above the announced score', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [{ playerId: 'p1', score: 10, rank: 1 }],
            rounds: [
              { label: 'Round 1', scores: [{ playerId: 'p1', score: 6 }] },
              { label: 'Round 2', scores: [{ playerId: 'p1', score: 6 }] },
            ],
          }),
        ),
      ).toThrow('Rounds sum to 12 for player p1, but the ranking says 10')
    })

    it('rounds summing below the announced score', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [{ playerId: 'p1', score: 10, rank: 1 }],
            rounds: [{ label: 'Round 1', scores: [{ playerId: 'p1', score: 4 }] }],
          }),
        ),
      ).toThrow('Rounds sum to 4 for player p1, but the ranking says 10')
    })

    it('an empty rounds array against a non-zero ranking', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({ ranking: [{ playerId: 'p1', score: 10, rank: 1 }], rounds: [] }),
        ),
      ).toThrow('Rounds sum to 0 for player p1, but the ranking says 10')
    })

    it('a player scored in a round but missing from the ranking', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [{ playerId: 'p1', score: 10, rank: 1 }],
            rounds: [
              {
                label: 'Round 1',
                scores: [
                  { playerId: 'p1', score: 10 },
                  { playerId: 'ghost', score: 3 },
                ],
              },
            ],
          }),
        ),
      ).toThrow('Round 1 (Round 1) scores player ghost, who is not in the ranking')
    })

    it('the same player twice in one round', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [{ playerId: 'p1', score: 10, rank: 1 }],
            rounds: [
              {
                label: 'Round 1',
                scores: [
                  { playerId: 'p1', score: 4 },
                  { playerId: 'p1', score: 6 },
                ],
              },
            ],
          }),
        ),
      ).toThrow('Player p1 appears twice in round 1 (Round 1)')
    })

    it('the same player twice in the ranking', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [
              { playerId: 'p1', score: 10, rank: 1 },
              { playerId: 'p1', score: 10, rank: 1 },
            ],
            rounds: [],
          }),
        ),
      ).toThrow('Player p1 appears twice in the ranking')
    })

    it('naming the round that carries the stray player, not the first one', () => {
      expect(() =>
        assertRoundsSumToRanking(
          result({
            ranking: [{ playerId: 'p1', score: 10, rank: 1 }],
            rounds: [
              { label: 'Opening', scores: [{ playerId: 'p1', score: 10 }] },
              { label: 'Closing', scores: [{ playerId: 'ghost', score: 1 }] },
            ],
          }),
        ),
      ).toThrow('Round 2 (Closing) scores player ghost, who is not in the ranking')
    })
  })

  // The same player may of course score in several different rounds — only a
  // repeat within one round is a bug.
  it('accepts a player appearing once per round across many rounds', () => {
    expect(() =>
      assertRoundsSumToRanking(
        result({
          ranking: [{ playerId: 'p1', score: 6, rank: 1 }],
          rounds: [
            { label: 'Round 1', scores: [{ playerId: 'p1', score: 1 }] },
            { label: 'Round 2', scores: [{ playerId: 'p1', score: 2 }] },
            { label: 'Round 3', scores: [{ playerId: 'p1', score: 3 }] },
          ],
        }),
      ),
    ).not.toThrow()
  })
})
