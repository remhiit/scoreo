import { describe, expect, it } from 'vitest'
import { lancerDes, LANCER_DES_VIDE } from '../../domain/lancerDes'
import type { EvenementCoup } from '../../domain/modeles'
import {
  estFinie,
  etatInitial,
  etatVierge,
  joueurActuel,
  milleSabordsModuleReducer as reducer,
  partieDeLEtat,
  versBrouillon,
} from './milleSabordsModuleReducer'
import type { MilleSabordsAction, MilleSabordsState } from './milleSabordsModuleTypes'

const TABLE = ['p1', 'p2', 'p3'] as const

function jouer(state: MilleSabordsState, ...actions: MilleSabordsAction[]): MilleSabordsState {
  return actions.reduce(reducer, state)
}

function coupManuel(joueur: string, score: number): EvenementCoup {
  return { type: 'manuel', joueur, scoreEntre: score, multiplicateur: 1, score }
}

describe('etatInitial', () => {
  it('starts a clean game when there is nothing to restore', () => {
    const state = etatInitial(TABLE, undefined)

    expect(state.joueurs).toEqual(['p1', 'p2', 'p3'])
    expect(state.historique).toEqual([])
    expect(state.des).toEqual(LANCER_DES_VIDE)
    expect(state.carte).toBe('none')
    expect(state.tab).toBe('calc')
    expect(state.multiplicateur).toBe(1)
    expect(state.finDemandee).toBe(false)
  })

  it('restores the turn in progress from a draft, dice included', () => {
    const brouillon = versBrouillon(
      jouer(
        etatVierge(TABLE),
        { type: 'selectTab', tab: 'manual' },
        { type: 'selectCard', carte: 'captain' },
        { type: 'changeDie', de: 'skulls', delta: 1 },
        { type: 'changeDie', de: 'diamonds', delta: 1 },
        { type: 'toggleMultiplier' },
        { type: 'updateManualScore', value: '450' },
      ),
    )

    const state = etatInitial(TABLE, brouillon)

    expect(state.tab).toBe('manual')
    expect(state.carte).toBe('captain')
    expect(state.des).toEqual(lancerDes({ cranes: 1, diamants: 1 }))
    expect(state.multiplicateur).toBe(2)
    expect(state.scoreManuel).toBe('450')
  })

  it('restores the event log so the standings survive a reload', () => {
    const joue = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '300' },
      { type: 'submitManualScore' },
    )

    const state = etatInitial(TABLE, versBrouillon(joue))

    expect(state.historique).toHaveLength(1)
    expect(partieDeLEtat(state).totalJoueur(0)).toBe(300)
  })

  it('accepts a draft whose optional turn keys are missing', () => {
    const state = etatInitial(TABLE, { version: 1, joueurs: [...TABLE], historique: [] })

    expect(state.tab).toBe('calc')
    expect(state.des).toEqual(LANCER_DES_VIDE)
    expect(state.scoreManuel).toBe('0')
  })

  it('reads a reopened match, whose payload carries no turn at all', () => {
    const state = etatInitial(TABLE, {
      joueurs: [...TABLE],
      historique: [coupManuel('p1', 500), coupManuel('p2', 200)],
    })

    expect(state.historique).toHaveLength(2)
    expect(partieDeLEtat(state).totalJoueur(0)).toBe(500)
    expect(state.carte).toBe('none')
  })

  it.each([
    ['null', null],
    ['a string', 'oups'],
    ['an empty object', {}],
    ['a payload from another version', { version: 2, joueurs: [...TABLE], historique: [] }],
    ['a truncated payload', { version: 1, joueurs: [...TABLE] }],
    [
      'a coup of an unknown shape',
      { version: 1, joueurs: [...TABLE], historique: [{ type: 'sortilege', joueur: 'p1' }] },
    ],
  ])('starts fresh rather than crashing on %s', (_label, charge) => {
    expect(etatInitial(TABLE, charge)).toEqual(etatVierge(TABLE))
  })

  it('ignores a draft recorded for another table', () => {
    const brouillon = versBrouillon(
      jouer(etatVierge(['p1', 'p2']), { type: 'quickSkullIsland', cranes: 4 }),
    )

    expect(etatInitial(TABLE, brouillon)).toEqual(etatVierge(TABLE))
  })

  it('ignores a draft recorded for the same players seated differently', () => {
    const brouillon = versBrouillon(
      jouer(etatVierge(['p2', 'p1', 'p3']), { type: 'quickSkullIsland', cranes: 4 }),
    )

    // Seating decides who plays when and who the island penalises: replaying a
    // history against a different order would silently rewrite the standings.
    expect(etatInitial(TABLE, brouillon)).toEqual(etatVierge(TABLE))
  })

  it('ignores a history crediting a player who is not at the table', () => {
    const charge = { joueurs: [...TABLE], historique: [coupManuel('fantome', 700)] }

    expect(etatInitial(TABLE, charge)).toEqual(etatVierge(TABLE))
  })
})

describe('versBrouillon', () => {
  it('round-trips a game in progress unchanged', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'changeDie', de: 'gold', delta: 3 },
      { type: 'selectCard', carte: 'gold' },
      { type: 'selectTab', tab: 'manual' },
      { type: 'updateManualScore', value: '-200' },
      { type: 'toggleMultiplier' },
    )

    expect(etatInitial(TABLE, versBrouillon(state))).toEqual(state)
  })
})

describe('dice counters', () => {
  it('counts a die up and back down', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'changeDie', de: 'parrots', delta: 1 },
      { type: 'changeDie', de: 'parrots', delta: 1 },
      { type: 'changeDie', de: 'parrots', delta: -1 },
    )

    expect(state.des.perroquets).toBe(1)
  })

  it('refuses to go below zero', () => {
    const state = reducer(etatVierge(TABLE), { type: 'changeDie', de: 'skulls', delta: -1 })

    expect(state.des).toEqual(LANCER_DES_VIDE)
  })

  it('refuses a ninth die: a hand only ever holds eight', () => {
    const plein = jouer(
      etatVierge(TABLE),
      ...Array.from({ length: 8 }, () => ({ type: 'changeDie', de: 'sabers', delta: 1 }) as const),
    )

    const trop = reducer(plein, { type: 'changeDie', de: 'gold', delta: 1 })

    expect(trop.des).toEqual(plein.des)
    expect(trop.des.sabres).toBe(8)
  })

  it('leaves the state untouched — identically — when a change is refused', () => {
    const state = etatVierge(TABLE)

    expect(reducer(state, { type: 'changeDie', de: 'gold', delta: -1 })).toBe(state)
  })
})

describe('the calculator tab', () => {
  it('records the score calculerScore announced, for the player whose turn it is', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'selectCard', carte: 'captain' },
      { type: 'changeDie', de: 'diamonds', delta: 4 },
      { type: 'submitCalcScore' },
    )

    const [coup] = state.historique
    expect(coup).toMatchObject({
      type: 'calculateur',
      joueur: 'p1',
      carte: 'captain',
      // 4 diamonds = 400, +200 series bonus, doubled by the Captain.
      score: 1200,
      bust: false,
    })
  })

  it('clears the dice, the card and the multiplier once a coup is recorded', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'selectCard', carte: 'skull2' },
      { type: 'changeDie', de: 'monkeys', delta: 3 },
      { type: 'toggleMultiplier' },
      { type: 'submitCalcScore' },
    )

    expect(state.des).toEqual(LANCER_DES_VIDE)
    expect(state.carte).toBe('none')
    expect(state.multiplicateur).toBe(1)
    expect(state.scoreManuel).toBe('0')
  })

  it('records the Skull Island penalty the whole table will pay', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'changeDie', de: 'skulls', delta: 4 },
      { type: 'submitCalcScore' },
    )

    expect(state.historique[0]).toMatchObject({ ileCranes: true, penaliteIle: -400, score: 0 })

    const partie = partieDeLEtat(state)
    expect(partie.totalJoueur(0)).toBe(0)
    // Clamped at zero at every coup: nobody starts the game in debt.
    expect(partie.totalJoueur(1)).toBe(0)
  })

  it('passes the turn to the next player', () => {
    const state = jouer(etatVierge(TABLE), { type: 'submitCalcScore' })

    expect(joueurActuel(state)).toBe('p2')
  })

  it('wraps back to the first player after a full round', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'submitCalcScore' },
      { type: 'submitCalcScore' },
      { type: 'submitCalcScore' },
    )

    expect(joueurActuel(state)).toBe('p1')
    expect(partieDeLEtat(state).mancheActuelle()).toBe(1)
  })
})

describe('the manual tab', () => {
  it('adds up the quick-score buttons instead of replacing the field', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'quickScore', points: 400 },
      { type: 'quickScore', points: 500 },
    )

    expect(state.scoreManuel).toBe('900')
  })

  it('subtracts a lost naval battle', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'quickScore', points: 300 },
      { type: 'quickScore', points: -1000 },
    )

    expect(state.scoreManuel).toBe('-700')
  })

  it('treats a field that is not a number as zero before adding', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '' },
      { type: 'quickScore', points: 200 },
    )

    expect(state.scoreManuel).toBe('200')
  })

  it('doubles the entered score when the Captain multiplier is on', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '650' },
      { type: 'toggleMultiplier' },
      { type: 'submitManualScore' },
    )

    expect(state.historique[0]).toEqual({
      type: 'manuel',
      joueur: 'p1',
      scoreEntre: 650,
      multiplicateur: 2,
      score: 1300,
    })
  })

  it('turns the multiplier back off', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'toggleMultiplier' },
      { type: 'toggleMultiplier' },
    )

    expect(state.multiplicateur).toBe(1)
  })

  it('drops the multiplier once the coup is in, so it never leaks to the next player', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '100' },
      { type: 'toggleMultiplier' },
      { type: 'submitManualScore' },
    )

    expect(state.multiplicateur).toBe(1)
  })

  it.each(['', '  ', '12.5', 'abc', '-'])('ignores a submit of %o', (value) => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value },
      { type: 'submitManualScore' },
    )

    expect(state.historique).toEqual([])
  })

  it('clears the field and the multiplier on reset', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '1234' },
      { type: 'toggleMultiplier' },
      { type: 'resetManualScore' },
    )

    expect(state.scoreManuel).toBe('0')
    expect(state.multiplicateur).toBe(1)
  })
})

describe('the quick Skull Island', () => {
  it('charges every opponent, and nothing to the player who rolled it', () => {
    const state = jouer(etatVierge(TABLE), { type: 'quickSkullIsland', cranes: 5 })

    expect(state.historique[0]).toEqual({
      type: 'ile',
      joueur: 'p1',
      nombreCranes: 5,
      penaliteParAdversaire: -500,
      multiplicateur: 1,
    })
  })

  it('doubles the penalty under the Captain', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'toggleMultiplier' },
      { type: 'quickSkullIsland', cranes: 6 },
    )

    expect(state.historique[0]).toMatchObject({ penaliteParAdversaire: -1200, multiplicateur: 2 })
  })

  it('takes the points off the opponents who had some', () => {
    const state = jouer(
      etatVierge(['p1', 'p2']),
      { type: 'updateManualScore', value: '1000' },
      { type: 'submitManualScore' },
      { type: 'updateManualScore', value: '800' },
      { type: 'submitManualScore' },
      { type: 'quickSkullIsland', cranes: 4 },
    )

    const partie = partieDeLEtat(state)
    expect(partie.totalJoueur(0)).toBe(1000)
    expect(partie.totalJoueur(1)).toBe(400)
  })
})

describe('undo', () => {
  it('does nothing when no coup has been played', () => {
    const state = etatVierge(TABLE)

    expect(reducer(state, { type: 'undoLast' })).toBe(state)
  })

  it('takes back the last coup and hands the turn back to its player', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '100' },
      { type: 'submitManualScore' },
      { type: 'updateManualScore', value: '200' },
      { type: 'submitManualScore' },
      { type: 'undoLast' },
    )

    expect(state.historique).toHaveLength(1)
    expect(joueurActuel(state)).toBe('p2')
    expect(partieDeLEtat(state).totalJoueur(1)).toBe(0)
  })

  it('clears the half-entered turn along with the coup', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'submitCalcScore' },
      { type: 'changeDie', de: 'gold', delta: 2 },
      { type: 'undoLast' },
    )

    expect(state.des).toEqual(LANCER_DES_VIDE)
  })

  it('lifts the last-round flag when the coup that crossed 6000 is taken back', () => {
    const joue = jouer(
      etatVierge(['p1', 'p2']),
      { type: 'updateManualScore', value: '6000' },
      { type: 'submitManualScore' },
    )
    expect(partieDeLEtat(joue).dernierTour).toBe(true)

    const annule = reducer(joue, { type: 'undoLast' })

    expect(partieDeLEtat(annule).dernierTour).toBe(false)
  })
})

describe('the end of the game', () => {
  it('is not over while nobody has crossed 6000', () => {
    const state = jouer(
      etatVierge(['p1', 'p2']),
      { type: 'updateManualScore', value: '900' },
      { type: 'submitManualScore' },
    )

    expect(estFinie(state, partieDeLEtat(state))).toBe(false)
  })

  it('lets everyone finish the round once someone crosses 6000', () => {
    const seuil = jouer(
      etatVierge(['p1', 'p2']),
      { type: 'updateManualScore', value: '6000' },
      { type: 'submitManualScore' },
    )
    expect(estFinie(seuil, partieDeLEtat(seuil))).toBe(false)

    const fini = jouer(
      seuil,
      { type: 'updateManualScore', value: '100' },
      { type: 'submitManualScore' },
    )

    expect(estFinie(fini, partieDeLEtat(fini))).toBe(true)
  })

  it('ends immediately on a Magie Pirate, mid-round', () => {
    const state = jouer(
      etatVierge(['p1', 'p2']),
      { type: 'selectCard', carte: 'diamond' },
      ...Array.from(
        { length: 8 },
        () => ({ type: 'changeDie', de: 'diamonds', delta: 1 }) as const,
      ),
      { type: 'submitCalcScore' },
    )

    const partie = partieDeLEtat(state)
    expect(partie.magiquePirate).toBe(true)
    expect(estFinie(state, partie)).toBe(true)
  })

  it('ends when the players simply stop, and resumes if they change their minds', () => {
    const joue = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '300' },
      { type: 'submitManualScore' },
      { type: 'requestEnd' },
    )
    expect(estFinie(joue, partieDeLEtat(joue))).toBe(true)

    const reprise = reducer(joue, { type: 'resumeGame' })

    expect(estFinie(reprise, partieDeLEtat(reprise))).toBe(false)
  })

  it('goes back to the game when the last coup is undone from the end screen', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '300' },
      { type: 'submitManualScore' },
      { type: 'requestEnd' },
      { type: 'undoLast' },
    )

    expect(state.finDemandee).toBe(false)
    expect(estFinie(state, partieDeLEtat(state))).toBe(false)
  })
})

describe('the abandon confirmation', () => {
  it('opens and closes without touching the game', () => {
    const joue = jouer(
      etatVierge(TABLE),
      { type: 'updateManualScore', value: '300' },
      { type: 'submitManualScore' },
      { type: 'showAbandonConfirm' },
    )
    expect(joue.confirmationAbandon).toBe(true)

    const ferme = reducer(joue, { type: 'dismissAbandonConfirm' })

    expect(ferme.confirmationAbandon).toBe(false)
    expect(ferme.historique).toEqual(joue.historique)
  })

  it('never reaches the draft: a reload must not reopen a modal', () => {
    const state = reducer(etatVierge(TABLE), { type: 'showAbandonConfirm' })

    expect(etatInitial(TABLE, versBrouillon(state)).confirmationAbandon).toBe(false)
  })
})

describe('tabs', () => {
  it('switches, and stays put across a coup', () => {
    const state = jouer(
      etatVierge(TABLE),
      { type: 'selectTab', tab: 'manual' },
      { type: 'updateManualScore', value: '100' },
      { type: 'submitManualScore' },
    )

    expect(state.tab).toBe('manual')
  })
})
