import { describe, expect, it } from 'vitest'
import { calculerScore } from './calculateurScore'
import { lancerDes as des } from './lancerDes'

/**
 * Unit tests for calculerScore(), transposed one for one from the Kotlin
 * ScoreCalculateurTest. The service is pure: it takes a LancerDes and a card,
 * with no global state.
 */
describe('ScoreCalculateurTest', () => {
  // ===== BUST (3 cranes exactement) =====

  it('bustExactement3Cranes', () => {
    const r = calculerScore(des({ cranes: 3, diamants: 2, or: 1, singes: 2 }), 'none')
    expect(r.score).toBe(0)
    expect(r.bust).toBe(true)
    expect(r.ileCranes).toBe(false)
  })

  it('bustAvec3CranesCarte_skull2', () => {
    // 1 dé crâne + carte skull2 = 3 cranes → bust (pas île car < 4)
    const r = calculerScore(des({ cranes: 1, diamants: 2, singes: 3, or: 2 }), 'skull2')
    expect(r.bust).toBe(true)
    expect(r.ileCranes).toBe(false)
    expect(r.score).toBe(0)
  })

  // ===== ÎLE DE LA TÊTE DE MORT (4+ cranes) =====

  it('ile_4Cranes', () => {
    const r = calculerScore(des({ cranes: 4, diamants: 2, singes: 2 }), 'none')
    expect(r.score).toBe(0)
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-400)
  })

  it('ile_8Cranes', () => {
    const r = calculerScore(des({ cranes: 8 }), 'none')
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-800)
  })

  it('ile_skull1PasseA4', () => {
    // 3 des crâne + carte skull1 → 4 cranes = île
    const r = calculerScore(des({ cranes: 3, diamants: 2, or: 1, singes: 2 }), 'skull1')
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-400)
  })

  it('ile_skull2Avec2DesCranes', () => {
    // 2 des crâne + carte skull2 → 4 cranes = île
    const r = calculerScore(des({ cranes: 2, diamants: 2, singes: 2, perroquets: 2 }), 'skull2')
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-400)
  })

  // ===== COMBAT NAVAL =====

  it('combatNaval2_gagne', () => {
    // 1 crâne + 2 sabres + 1 💎 + 2 🪙 + 2 🐒 = 8 → score = 600
    const r = calculerScore(des({ cranes: 1, sabres: 2, diamants: 1, or: 2, singes: 2 }), 'sea2')
    expect(r.bust).toBe(false)
    expect(r.score).toBe(600)
  })

  it('combatNaval2_perdu', () => {
    const r = calculerScore(des({ cranes: 1, sabres: 1, diamants: 2, or: 2, singes: 2 }), 'sea2')
    expect(r.score).toBe(-300)
    expect(r.bust).toBe(false)
  })

  it('combatNaval3_gagne', () => {
    // 3 sabres + 2💎 + 2🪙 + 1🐒 = 8 → score = 1000
    expect(calculerScore(des({ sabres: 3, diamants: 2, or: 2, singes: 1 }), 'sea3').score).toBe(
      1000,
    )
  })

  it('combatNaval4_gagne', () => {
    // 4 sabres + 2💎 + 2🪙 = 8 → score = 2100
    expect(calculerScore(des({ sabres: 4, diamants: 2, or: 2 }), 'sea4').score).toBe(2100)
  })

  it('combatNaval_bustAvec3Cranes', () => {
    const r = calculerScore(des({ cranes: 3, sabres: 2, singes: 2, perroquets: 1 }), 'sea2')
    expect(r.score).toBe(-300)
    expect(r.bust).toBe(true)
  })

  // ===== SÉRIES =====

  it('serie3Singes', () => {
    // 3🐒 + 2🦜 + 1💎 + 2🪙 = 8 → score = 400
    expect(calculerScore(des({ singes: 3, perroquets: 2, diamants: 1, or: 2 }), 'none').score).toBe(
      400,
    )
  })

  it('serie4Perroquets', () => {
    // 4🦜 + 2🐒 + 1💎 + 1🪙 = 8 → score = 400
    expect(calculerScore(des({ perroquets: 4, singes: 2, diamants: 1, or: 1 }), 'none').score).toBe(
      400,
    )
  })

  it('serie3Diamants', () => {
    // 3💎 + 2🐒 + 2🦜 + 1🪙 = 8 → score = 500
    expect(calculerScore(des({ diamants: 3, singes: 2, perroquets: 2, or: 1 }), 'none').score).toBe(
      500,
    )
  })

  it('serie5Sabres', () => {
    // 5⚔️ + 1💎 + 1🪙 + 1🐒 = 8 → score = 700
    expect(calculerScore(des({ sabres: 5, diamants: 1, or: 1, singes: 1 }), 'none').score).toBe(700)
  })

  it('serie8Sabres_avecCoffrePlein', () => {
    const r = calculerScore(des({ sabres: 8 }), 'none')
    expect(r.score).toBe(4500)
    expect(r.details).toContain('Coffre plein')
  })

  it('serie8Diamants_avecCoffrePlein', () => {
    expect(calculerScore(des({ diamants: 8 }), 'none').score).toBe(5300)
  })

  // ===== COFFRE PLEIN =====

  it('pasCoffrePlein_avecCranes', () => {
    // 1💀 + 7⚔️ → serie 7 = 2000, pas de coffre plein
    const r = calculerScore(des({ cranes: 1, sabres: 7 }), 'none')
    expect(r.score).toBe(2000)
    expect(r.details).not.toContain('Coffre plein')
  })

  it('pasCoffrePlein_pairesSeules', () => {
    const r = calculerScore(des({ cranes: 1, singes: 2, sabres: 5 }), 'none')
    expect(r.score).toBe(500)
    expect(r.details).not.toContain('Coffre plein')
  })

  // ===== CAPITAINE =====

  it('capitaineDoubleLeScore', () => {
    // 3💎 + 3🪙 + 2🐒 = 8 → avant doublement : 800 → après : 1600
    expect(calculerScore(des({ diamants: 3, or: 3, singes: 2 }), 'captain').score).toBe(1600)
  })

  it('capitaineDoubleScoreIndividuel', () => {
    // 2🐒 + 2🦜 + 2⚔️ + 2💎 → 200 (💎) × 2 = 400
    expect(
      calculerScore(des({ singes: 2, perroquets: 2, sabres: 2, diamants: 2 }), 'captain').score,
    ).toBe(400)
  })

  it('capitaineAvecBustRenvoieNégatif', () => {
    const r = calculerScore(des({ cranes: 3, sabres: 2, singes: 3 }), 'captain')
    expect(r.score).toBe(0)
    expect(r.bust).toBe(true)
  })

  // ===== CARTES BONUS =====

  it('carteDiamant_ajouteUnDiamantScorant', () => {
    // 2💎 des + carte → 3 scorants = 400(💎) + 200(🪙) = 600
    expect(
      calculerScore(des({ diamants: 2, or: 2, singes: 2, perroquets: 2 }), 'diamond').score,
    ).toBe(600)
  })

  it('carteOr_ajouteUnOrScorant', () => {
    expect(calculerScore(des({ or: 2, diamants: 2, singes: 2, perroquets: 2 }), 'gold').score).toBe(
      600,
    )
  })

  it('skull1_ajouteUnCrane', () => {
    // 2 des crâne + carte skull1 → 3 cranes = bust
    const r = calculerScore(des({ cranes: 2, diamants: 2, singes: 2, perroquets: 2 }), 'skull1')
    expect(r.bust).toBe(true)
    expect(r.ileCranes).toBe(false)
  })

  it('skull2_ajouteDeuxCranes', () => {
    // 2 des crâne + carte skull2 → 4 cranes = île
    const r = calculerScore(des({ cranes: 2, diamants: 2, singes: 2, perroquets: 2 }), 'skull2')
    expect(r.ileCranes).toBe(true)
    expect(r.penaliteIle).toBe(-400)
  })

  it('carteAnimaux_combinesSingesEtPerroquets', () => {
    const avecAnimaux = calculerScore(des({ singes: 4, perroquets: 4 }), 'animals')
    const sansAnimaux = calculerScore(des({ singes: 4, perroquets: 4 }), 'none')
    // avec : 8 animaux → 4000 + 500 coffre = 4500
    expect(avecAnimaux.score).toBe(4500)
    // sans : 4🐒(200) + 4🦜(200) + coffre(500) = 900
    expect(sansAnimaux.score).toBe(900)
    expect(avecAnimaux.score).toBeGreaterThan(sansAnimaux.score)
  })

  it('carteAnimaux_3Singes3Perroquets', () => {
    const avecAnimaux = calculerScore(
      des({ singes: 3, perroquets: 3, diamants: 1, or: 1 }),
      'animals',
    )
    const sansAnimaux = calculerScore(des({ singes: 3, perroquets: 3, diamants: 1, or: 1 }), 'none')
    expect(avecAnimaux.score).toBeGreaterThan(sansAnimaux.score)
  })

  it('carteSorciere_sansEffetSurLeScore', () => {
    const d = des({ diamants: 3, singes: 3, or: 2 })
    expect(calculerScore(d, 'witch').score).toBe(calculerScore(d, 'none').score)
  })

  // ===== CAS LIMITES =====

  it('scoreNul_sansSerieSansDiamantsOrOr', () => {
    // 2🐒 + 2🦜 + 2⚔️ + 1💎 + 1🪙 = 8 → score = 200
    expect(
      calculerScore(des({ singes: 2, perroquets: 2, sabres: 2, diamants: 1, or: 1 }), 'none').score,
    ).toBe(200)
  })

  it('zeroCranes_scoreMinime', () => {
    // 2🐒 + 2🦜 + 2⚔️ + 2💎 = 8 → 200 (2💎 individuel)
    const r = calculerScore(des({ singes: 2, perroquets: 2, sabres: 2, diamants: 2 }), 'none')
    expect(r.score).toBe(200)
    expect(r.bust).toBe(false)
  })

  // ===== MAGIE PIRATE =====

  it('magiePirate_8DiamantsCarte_diamond', () => {
    // 8 diamants + carte diamond = 9 diamants → Magie Pirate
    const r = calculerScore(des({ diamants: 8 }), 'diamond')
    expect(r.magiquePirate).toBe(true)
    expect(r.bust).toBe(false)
    // Score : 9×100 = 900 individuel + 4000 serie-9 + 500 coffre plein
    expect(r.score).toBe(5400)
  })

  it('magiePirate_8OrCarte_gold', () => {
    // 8 pièces d'or + carte gold = 9 or → Magie Pirate
    const r = calculerScore(des({ or: 8 }), 'gold')
    expect(r.magiquePirate).toBe(true)
    expect(r.bust).toBe(false)
    expect(r.score).toBe(5400)
  })

  it('pasMagiePirate_7Diamants_carteDiamond', () => {
    // 7 diamants + carte diamond = 8 → pas Magie Pirate
    const r = calculerScore(des({ diamants: 7, singes: 1 }), 'diamond')
    expect(r.magiquePirate).toBe(false)
  })

  it('pasMagiePirate_8Diamants_sansCarte', () => {
    // 8 diamants mais pas la carte diamond → 8-of-a-kind normal
    const r = calculerScore(des({ diamants: 8 }), 'none')
    expect(r.magiquePirate).toBe(false)
    // Score : 8×100 + 4000 serie + 500 coffre plein = 5300
    expect(r.score).toBe(5300)
  })

  it('magiePirate_detailsMentionneVictoire', () => {
    const r = calculerScore(des({ diamants: 8 }), 'diamond')
    expect(r.details).toContain('Magie Pirate')
  })
})
