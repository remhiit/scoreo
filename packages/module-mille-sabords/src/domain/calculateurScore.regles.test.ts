import { describe, expect, it } from 'vitest'
import { calculerScore } from './calculateurScore'
import { lancerDes as des } from './lancerDes'

/**
 * Exhaustive tests based on the official rules ("Piraten" leaflet), transposed
 * one for one from the Kotlin RèglesTest. Every rule of the leaflet is covered
 * by at least one test. Fixed bugs are marked [RÈGLE].
 */
describe('ReglesTest', () => {
  // =========================================================
  // RÈGLE : Bust — 3 cranes ou plus = 0 point
  // =========================================================

  it('bust_3Cranes_zeroPoint', () => {
    const r = calculerScore(des({ cranes: 3, sabres: 2, singes: 2, or: 1 }), 'none')
    expect(r.score).toBe(0)
    expect(r.bust).toBe(true)
    expect(r.ileCranes).toBe(false)
  })

  it('bust_3Cranes_pasDeSerieSupplementaire', () => {
    const r = calculerScore(des({ cranes: 3, sabres: 5 }), 'none')
    expect(r.score).toBe(0)
    expect(r.bust).toBe(true)
  })

  // =========================================================
  // RÈGLE : Île de la Tête de Mort — 4+ cranes au 1er lancer
  // Pénalité = -100 pts × cranes pour chaque adversaire
  // =========================================================

  it('ile_4Cranes_moins400AuxAdversaires', () => {
    const r = calculerScore(des({ cranes: 4, diamants: 2, singes: 2 }), 'none')
    expect(r.ileCranes).toBe(true)
    expect(r.score).toBe(0)
    expect(r.penaliteIle).toBe(-400)
  })

  it('ile_6Cranes_moins600AuxAdversaires', () => {
    const r = calculerScore(des({ cranes: 6, diamants: 1, or: 1 }), 'none')
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-600)
  })

  it('ile_8Cranes_moins800AuxAdversaires', () => {
    const r = calculerScore(des({ cranes: 8 }), 'none')
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-800)
  })

  // =========================================================
  // RÈGLE [BUG CORRIGÉ] : Carte Capitaine + Île de la Tête de Mort
  // → les adversaires perdent 200 pts par crâne (et non 100)
  // =========================================================

  it('capitaineIle_4Cranes_pénalité200Chacun', () => {
    const r = calculerScore(des({ cranes: 4, diamants: 2, singes: 2 }), 'captain')
    expect(r.ileCranes).toBe(true)
    expect(r.score).toBe(0)
    expect(r.penaliteIle).toBe(-800) // 4 × 200
  })

  it('capitaineIle_5Cranes_pénalité1000', () => {
    const r = calculerScore(des({ cranes: 5, diamants: 2, or: 1 }), 'captain')
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-1000) // 5 × 200
  })

  it('capitaineIle_plusLourdeQueSansCapitaine', () => {
    const d = des({ cranes: 4, or: 2, singes: 2 })
    const avecCapitaine = calculerScore(d, 'captain')
    const sansCapitaine = calculerScore(d, 'none')
    expect(avecCapitaine.penaliteIle).toBeLessThan(sansCapitaine.penaliteIle)
  })

  // =========================================================
  // RÈGLE : Combat Naval empêche l'Île de la Tête de Mort
  // =========================================================

  it('combatNaval_avec4Cranes_estDefaite_pasIle', () => {
    const r = calculerScore(des({ cranes: 4, sabres: 1, diamants: 2, or: 1 }), 'sea2')
    expect(r.ileCranes).toBe(false)
    expect(r.score).toBe(-300)
    expect(r.bust).toBe(true)
  })

  it('combatNaval_avec8Cranes_estDefaite_pasIle', () => {
    const r = calculerScore(des({ cranes: 8 }), 'sea4')
    expect(r.ileCranes).toBe(false)
    expect(r.score).toBe(-1000)
  })

  it('combatNaval_avec3Cranes_estDefaiteCombat_pasBustNormal', () => {
    const r = calculerScore(des({ cranes: 3, sabres: 2, diamants: 2, or: 1 }), 'sea2')
    expect(r.score).toBe(-300)
    expect(r.bust).toBe(true)
    expect(r.ileCranes).toBe(false)
  })

  // =========================================================
  // RÈGLE [BUG CORRIGÉ] : Coffre au trésor plein
  // Les cranes (1-2) empêchent le coffre plein
  // =========================================================

  it('pasCoffrePlein_1Crane_7Sabres', () => {
    const r = calculerScore(des({ cranes: 1, sabres: 7 }), 'none')
    expect(r.score).toBe(2000)
    expect(r.details).not.toContain('Coffre plein')
  })

  it('pasCoffrePlein_2Cranes_6Sabres', () => {
    const r = calculerScore(des({ cranes: 2, sabres: 6 }), 'none')
    expect(r.score).toBe(1000)
    expect(r.details).not.toContain('Coffre plein')
  })

  it('pasCoffrePlein_1Crane_5Sabres_2Diamants', () => {
    const r = calculerScore(des({ cranes: 1, sabres: 5, diamants: 2 }), 'none')
    expect(r.score).toBe(700)
    expect(r.details).not.toContain('Coffre plein')
  })

  it('pasCoffrePlein_1Crane_DesNonScorants', () => {
    const r = calculerScore(des({ cranes: 1, singes: 2, sabres: 5 }), 'none')
    expect(r.score).toBe(500)
    expect(r.details).not.toContain('Coffre plein')
  })

  it('coffrePlein_4Diamants_4Or_sansCranes', () => {
    const r = calculerScore(des({ diamants: 4, or: 4 }), 'none')
    expect(r.score).toBe(1700) // 600 + 600 + 500
    expect(r.details).toContain('Coffre plein')
  })

  // =========================================================
  // RÈGLE : Diamants et pièces d'or — 100 pts chacun + series
  // =========================================================

  it('diamants_toujoursScore100Chacun', () => {
    const r = calculerScore(
      des({ diamants: 1, singes: 2, perroquets: 2, sabres: 2, or: 1 }),
      'none',
    )
    expect(r.score).toBe(200)
  })

  it('or_toujoursScore100Chacun', () => {
    expect(calculerScore(des({ or: 2, singes: 2, perroquets: 2, sabres: 2 }), 'none').score).toBe(
      200,
    )
  })

  it('diamants_bonusSerie_plusIndividuel', () => {
    // 3💎 (300+100 serie) + 2🐒 (pas de serie) + 2🦜 (pas de serie) + 1🪙 (100) = 500
    // Les 2 singes et 2 perroquets empêchent le coffre plein
    const r = calculerScore(des({ diamants: 3, singes: 2, perroquets: 2, or: 1 }), 'none')
    expect(r.score).toBe(500)
  })

  it('or_bonusSerie_plusIndividuel', () => {
    // 3🪙 (300+100 serie) + 2🐒 (pas de serie) + 2🦜 (pas de serie) + 1💎 (100) = 500
    const r = calculerScore(des({ or: 3, singes: 2, perroquets: 2, diamants: 1 }), 'none')
    expect(r.score).toBe(500)
  })

  // =========================================================
  // RÈGLE : Series de des identiques
  // =========================================================

  it('serie_3Singes_bonus100', () => {
    // 3🐒 + 2🦜 (bloque coffre plein) + 1💎 + 2🪙 = 8
    // score = 100(serie 3🐒) + 100(💎) + 200(2🪙) = 400
    const r = calculerScore(des({ singes: 3, perroquets: 2, diamants: 1, or: 2 }), 'none')
    expect(r.score).toBe(400)
  })

  it('serie_5Sabres_bonus500', () => {
    const r = calculerScore(des({ sabres: 5, diamants: 1, or: 1, singes: 1 }), 'none')
    expect(r.score).toBe(700) // 100 + 100 + 500
  })

  it('serie_8DesDunType_avecCoffrePlein', () => {
    const r = calculerScore(des({ singes: 8 }), 'none')
    expect(r.score).toBe(4500) // 4000 (serie 8) + 500 (coffre)
    expect(r.details).toContain('Coffre plein')
  })

  // =========================================================
  // RÈGLE : Carte Animaux — singes et perroquets forment une serie commune
  // =========================================================

  it('animaux_3Singes3Perroquets_serieCombinee', () => {
    // 3🐒 + 3🦜 = 6 animaux → BONUS_SÉRIES[6] = 1000
    // + 1💎 (100) + 1🪙 (100) + coffre plein (500) = 1700
    const r = calculerScore(des({ singes: 3, perroquets: 3, diamants: 1, or: 1 }), 'animals')
    expect(r.score).toBe(1700)
  })

  it('animaux_8Animaux_avecCoffrePlein', () => {
    const r = calculerScore(des({ singes: 4, perroquets: 4 }), 'animals')
    expect(r.score).toBe(4500) // 4000 + 500
  })

  // =========================================================
  // RÈGLE : Capitaine — double le score final (hors île)
  // =========================================================

  it('capitaine_doubleLaVictoire', () => {
    const r = calculerScore(des({ diamants: 3, or: 3, singes: 2 }), 'captain')
    expect(r.score).toBe(1600) // 800 × 2
  })

  it('capitaine_nestPasDouble_siBust', () => {
    const r = calculerScore(des({ cranes: 3, sabres: 2, singes: 3 }), 'captain')
    expect(r.bust).toBe(true)
    expect(r.score).toBe(0)
  })
})
