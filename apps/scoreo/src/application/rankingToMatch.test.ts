import { describe, expect, it } from 'vitest'
import { rankingToMatch } from './rankingToMatch'

const base = { id: 'm1', date: 1000, gameTypeId: 'gt1' }

describe('rankingToMatch', () => {
  it('turns the ranking into player scores, in order', () => {
    const match = rankingToMatch({
      ...base,
      ranking: [
        { playerId: 'p1', score: 9, rank: 1 },
        { playerId: 'p2', score: 5, rank: 2 },
      ],
    })

    expect(match.playerScores).toEqual([
      { playerId: 'p1', score: 9 },
      { playerId: 'p2', score: 5 },
    ])
  })

  // The source owns tie-breaks Scoreo knows nothing about, so the winners come
  // from the announced rank rather than from recomputing the top score.
  it('makes every rank 1 a manual winner', () => {
    const match = rankingToMatch({
      ...base,
      ranking: [
        { playerId: 'p1', score: 9, rank: 1 },
        { playerId: 'p2', score: 5, rank: 2 },
      ],
    })

    expect(match.manualWinners).toEqual(['p1'])
  })

  it('keeps several winners when the source declares a tie', () => {
    const match = rankingToMatch({
      ...base,
      ranking: [
        { playerId: 'p1', score: 7, rank: 1 },
        { playerId: 'p2', score: 7, rank: 1 },
      ],
    })

    expect(match.manualWinners).toEqual(['p1', 'p2'])
  })

  it('trusts the rank over the scores', () => {
    // Torī Valley settles this on Torī count, then Pinceau: p2 wins despite the
    // identical total, and Scoreo must not second-guess it.
    const match = rankingToMatch({
      ...base,
      ranking: [
        { playerId: 'p1', score: 7, rank: 2 },
        { playerId: 'p2', score: 7, rank: 1 },
      ],
    })

    expect(match.manualWinners).toEqual(['p2'])
  })

  it('names no winner when the source ranks nobody first', () => {
    const match = rankingToMatch({
      ...base,
      ranking: [{ playerId: 'p1', score: 3, rank: 2 }],
    })

    expect(match.manualWinners).toEqual([])
  })

  it('stores no rounds when none are given', () => {
    expect(rankingToMatch({ ...base, ranking: [] }).rounds).toEqual([])
  })

  it('copies the rounds it is given', () => {
    const rounds = [[{ playerId: 'p1', score: 4 }], [{ playerId: 'p1', score: 5 }]]
    const match = rankingToMatch({ ...base, ranking: [], rounds })

    expect(match.rounds).toEqual(rounds)
    // A defensive copy: the module keeps its own arrays, and a stored match must
    // not change under it.
    expect(match.rounds[0]).not.toBe(rounds[0])
  })

  it('leaves the secondary scores empty — no outside source carries them', () => {
    expect(rankingToMatch({ ...base, ranking: [] }).secondaryPlayerScores).toEqual([])
  })

  it('stores no module payload by default', () => {
    expect(rankingToMatch({ ...base, ranking: [] }).moduleData).toBeNull()
  })

  it('stores the module payload verbatim when given one', () => {
    const moduleData = { moduleId: 'tori-valley', version: 1, data: { anything: true } }
    expect(rankingToMatch({ ...base, ranking: [], moduleData }).moduleData).toEqual(moduleData)
  })

  it('carries the id, date and game type through', () => {
    const match = rankingToMatch({ ...base, ranking: [] })
    expect(match.id).toBe('m1')
    expect(match.date).toBe(1000)
    expect(match.gameTypeId).toBe('gt1')
  })
})
