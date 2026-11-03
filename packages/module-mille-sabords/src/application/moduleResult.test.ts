import { assertMatchConsistent, newGameType } from '@scoreboards/shared-domain'
import { describe, expect, it } from 'vitest'
import { lancerDes } from '../domain/lancerDes'
import type { EvenementCoup } from '../domain/modeles'
import {
  buildModuleMatch,
  classementFinal,
  MilleSabordsModuleDataSchema,
  replayPartie,
  type MilleSabordsModuleData,
} from './moduleResult'

const TYPE_DE_JEU = newGameType('gt-sabords', '1000 Sabords', 'HIGHEST_SCORE', {
  moduleId: 'mille-sabords',
})

function manuel(joueur: string, score: number): EvenementCoup {
  return { type: 'manuel', joueur, scoreEntre: score, multiplicateur: 1, score }
}

function ile(joueur: string, cranes: number): EvenementCoup {
  return {
    type: 'ile',
    joueur,
    nombreCranes: cranes,
    penaliteParAdversaire: -(cranes * 100),
    multiplicateur: 1,
  }
}

describe('replayPartie', () => {
  it('derives the last-round flag from the log rather than from a stored field', () => {
    const partie = replayPartie(['p1', 'p2'], [manuel('p1', 6000), manuel('p2', 100)])

    expect(partie.dernierTour).toBe(true)
    expect(partie.estTerminee()).toBe(true)
  })

  it('brings back a Magie Pirate win, which lives on the coup itself', () => {
    const magie: EvenementCoup = {
      type: 'calculateur',
      joueur: 'p1',
      carte: 'diamond',
      des: lancerDes({ diamants: 8 }),
      score: 4900,
      details: '',
      bust: false,
      ileCranes: false,
      penaliteIle: 0,
      magiquePirate: true,
    }

    expect(replayPartie(['p1', 'p2'], [magie]).magiquePirate).toBe(true)
  })

  it('clamps at zero at every coup, so nobody carries a debt forward', () => {
    // p2 is charged 700 twice while holding 400: the second island finds an
    // empty chest, it does not deepen a -300.
    const partie = replayPartie(
      ['p1', 'p2'],
      [manuel('p2', 400), ile('p1', 7), manuel('p2', 500), ile('p1', 7)],
    )

    expect(partie.totalJoueur(1)).toBe(0)
  })
})

describe('classementFinal', () => {
  it('sorts by score, highest first', () => {
    const partie = replayPartie(
      ['p1', 'p2', 'p3'],
      [manuel('p1', 100), manuel('p2', 900), manuel('p3', 500)],
    )

    expect(classementFinal(partie).map((joueur) => joueur.nom)).toEqual(['p2', 'p3', 'p1'])
  })

  it('keeps tied players in seating order', () => {
    const partie = replayPartie(['p1', 'p2'], [manuel('p1', 700), manuel('p2', 700)])

    expect(classementFinal(partie).map((joueur) => joueur.nom)).toEqual(['p1', 'p2'])
  })
})

describe('buildModuleMatch', () => {
  it('ranks the players by their clamped totals, winner first', () => {
    const result = buildModuleMatch({
      joueurs: ['p1', 'p2'],
      historique: [manuel('p1', 1000), manuel('p2', 2500)],
    })

    expect(result.playerScores).toEqual([
      { playerId: 'p2', score: 2500 },
      { playerId: 'p1', score: 1000 },
    ])
    expect(result.manualWinners).toEqual(['p2'])
  })

  it('splits the log into one round per lap of the table', () => {
    const result = buildModuleMatch({
      joueurs: ['p1', 'p2'],
      historique: [manuel('p1', 100), manuel('p2', 200), manuel('p1', 300), manuel('p2', 400)],
    })

    expect(result.rounds).toEqual([
      [
        { playerId: 'p2', score: 200 },
        { playerId: 'p1', score: 100 },
      ],
      [
        { playerId: 'p2', score: 400 },
        { playerId: 'p1', score: 300 },
      ],
    ])
  })

  it('satisfies the host invariant even when an island wipes a player out', () => {
    // The one case a naive delta gets wrong: p2 falls below zero mid-game, and
    // only per-coup clamping keeps the rounds summing back to the final total.
    const result = buildModuleMatch({
      joueurs: ['p1', 'p2'],
      historique: [
        manuel('p1', 300),
        manuel('p2', 200),
        ile('p1', 9),
        manuel('p2', 400),
        manuel('p1', 100),
        manuel('p2', 6000),
      ],
    })

    expect(() => assertMatchConsistent(result, TYPE_DE_JEU)).not.toThrow()

    for (const entree of result.playerScores) {
      const somme = result.rounds
        .flat()
        .filter((score) => score.playerId === entree.playerId)
        .reduce((total, score) => total + score.score, 0)
      expect(somme).toBe(entree.score)
    }
  })

  it('leaves out the round detail of a game where nothing was played', () => {
    const result = buildModuleMatch({ joueurs: ['p1', 'p2'], historique: [] })

    expect(result.rounds).toEqual([])
    expect(result.playerScores).toEqual([
      { playerId: 'p1', score: 0 },
      { playerId: 'p2', score: 0 },
    ])
    expect(() => assertMatchConsistent(result, TYPE_DE_JEU)).not.toThrow()
  })

  it('carries the match id back so a reopened game is updated, not duplicated', () => {
    const result = buildModuleMatch({
      joueurs: ['p1', 'p2'],
      historique: [manuel('p1', 100), manuel('p2', 100)],
      matchId: 'match-42',
    })

    expect(result.id).toBe('match-42')
  })

  it('creates rather than updates when no match is being reopened', () => {
    const result = buildModuleMatch({ joueurs: ['p1'], historique: [] })

    expect('id' in result).toBe(false)
  })

  it('leaves the evening to the host', () => {
    const result = buildModuleMatch({ joueurs: ['p1'], historique: [manuel('p1', 10)] })

    expect(result.date).toBeUndefined()
  })

  // What the host stored before the module wrote `Match` fields itself: the
  // export's ranking order kept, `rank === 1` as the winners, the rounds copied.
  // The expectations are frozen literals of that old output, not rebuilt from
  // the export the module itself calls.
  describe('is equivalent to the match the host used to build from the ranking', () => {
    const s = (playerId: string, score: number) => ({ playerId, score })
    const corpus: Record<
      string,
      {
        joueurs: string[]
        historique: EvenementCoup[]
        scores: ReturnType<typeof s>[]
        winners: string[]
        rounds: ReturnType<typeof s>[][]
      }
    > = {
      'a decided game': {
        joueurs: ['p1', 'p2', 'p3'],
        historique: [manuel('p1', 100), manuel('p2', 900), manuel('p3', 500), manuel('p1', 50)],
        scores: [s('p2', 900), s('p3', 500), s('p1', 150)],
        winners: ['p2'],
        rounds: [
          [s('p2', 900), s('p3', 500), s('p1', 100)],
          [s('p2', 0), s('p3', 0), s('p1', 50)],
        ],
      },
      'a tie on points (seating order breaks it)': {
        joueurs: ['p1', 'p2'],
        historique: [manuel('p1', 700), manuel('p2', 700)],
        scores: [s('p1', 700), s('p2', 700)],
        winners: ['p1'],
        rounds: [[s('p1', 700), s('p2', 700)]],
      },
      'an island wiping a player out': {
        joueurs: ['p1', 'p2'],
        historique: [manuel('p2', 200), ile('p1', 9), manuel('p2', 400), manuel('p1', 100)],
        scores: [s('p2', 400), s('p1', 100)],
        winners: ['p2'],
        rounds: [
          [s('p2', 0), s('p1', 0)],
          [s('p2', 400), s('p1', 100)],
        ],
      },
      'a game where nothing was played': {
        joueurs: ['p1', 'p2'],
        historique: [],
        scores: [s('p1', 0), s('p2', 0)],
        winners: ['p1'],
        rounds: [],
      },
    }

    for (const [name, { joueurs, historique, scores, winners, rounds }] of Object.entries(corpus)) {
      it(name, () => {
        expect(buildModuleMatch({ joueurs, historique, matchId: 'm1' })).toEqual({
          id: 'm1',
          playerScores: scores,
          manualWinners: winners,
          rounds,
          moduleData: { version: 1, data: { joueurs, historique } },
        })
      })
    }
  })

  it('hands back a payload that reopens the very same game', () => {
    const historique = [manuel('p1', 100), ile('p2', 4), manuel('p1', 250)]
    const result = buildModuleMatch({ joueurs: ['p1', 'p2'], historique })

    const relu = MilleSabordsModuleDataSchema.parse(result.moduleData?.data)

    expect(relu).toEqual({ joueurs: ['p1', 'p2'], historique } satisfies MilleSabordsModuleData)
    expect(result.moduleData?.version).toBe(1)
  })

  it('records the players by id, never by name', () => {
    const data = buildModuleMatch({ joueurs: ['id-a', 'id-b'], historique: [] }).moduleData
      ?.data as MilleSabordsModuleData

    expect(data.joueurs).toEqual(['id-a', 'id-b'])
  })
})
