import { beforeEach, describe, expect, it } from 'vitest'
import { Partie } from './partie'
import type { CoupIleCranes, CoupManuel } from './modeles'

/**
 * Unit tests for the Partie methods — totalJoueur, mancheActuelle, manches,
 * totalMax — transposed one for one from the Kotlin EtatTest.
 *
 * The Kotlin original reset a shared `val partie` between tests, because that
 * app had one. This port does not: each test gets its own aggregate, which is
 * also how the module uses it — the reducer replays one from the event log.
 */
describe('EtatTest', () => {
  let partie: Partie

  beforeEach(() => {
    partie = new Partie()
  })

  const coup = (indexJoueur: number, score: number): CoupManuel => ({
    type: 'manuel',
    joueur: partie.joueurs[indexJoueur],
    scoreEntre: score,
    multiplicateur: 1,
    score,
  })

  const coupIle = (
    indexJoueur: number,
    penalite: number,
    cranes: number = Math.trunc(-penalite / 100),
  ): CoupIleCranes => ({
    type: 'ile',
    joueur: partie.joueurs[indexJoueur],
    nombreCranes: cranes,
    penaliteParAdversaire: penalite,
    multiplicateur: 1,
  })

  // ===== totalJoueur =====

  it('totalJoueur_historiqueVide', () => {
    partie.joueurs.push('Alice')
    expect(partie.totalJoueur(0)).toBe(0)
  })

  it('totalJoueur_sommeSesScores', () => {
    partie.joueurs.push('Alice')
    partie.historique.push(coup(0, 100))
    partie.historique.push(coup(0, 250))
    expect(partie.totalJoueur(0)).toBe(350)
  })

  it('totalJoueur_ignoreAutresJoueurs', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.historique.push(coup(0, 300))
    partie.historique.push(coup(1, 500))
    expect(partie.totalJoueur(0)).toBe(300)
    expect(partie.totalJoueur(1)).toBe(500)
  })

  it('totalJoueur_bloqueAZero', () => {
    partie.joueurs.push('Alice')
    partie.historique.push(coup(0, -500))
    expect(partie.totalJoueur(0)).toBe(0)
  })

  it('totalJoueur_repriseAprèsClamp', () => {
    partie.joueurs.push('Alice')
    partie.historique.push(coup(0, -500))
    partie.historique.push(coup(0, 300))
    expect(partie.totalJoueur(0)).toBe(300)
  })

  it('totalJoueur_clampCumulatifParTour', () => {
    partie.joueurs.push('Alice')
    partie.historique.push(coup(0, -200))
    partie.historique.push(coup(0, -150))
    partie.historique.push(coup(0, 400))
    expect(partie.totalJoueur(0)).toBe(400)
  })

  // ===== Île de la Tête de Mort (îleCrânes) =====

  it('ile_penaliteAppliqueeAuxAutres', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.historique.push(coup(0, 200)) // Alice +200
    partie.historique.push(coup(1, 100)) // Bob +100
    partie.historique.push(coupIle(0, -300)) // Alice île → -300 aux autres
    // Bob : 100 + (-300) = -200 → clamp → 0
    expect(partie.totalJoueur(1)).toBe(0)
    // Alice : 200 (pas de penalite sur soi-même)
    expect(partie.totalJoueur(0)).toBe(200)
  })

  it('ile_joueurNePerdPasLuiMeme', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.historique.push(coupIle(1, -400)) // Bob île
    expect(partie.totalJoueur(1)).toBe(0) // Bob : score île = 0
    expect(partie.totalJoueur(0)).toBe(0) // Alice : 0 + (-400) → clamp
  })

  it('ile_penaliteRespecteLeCamp', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.historique.push(coup(0, 1000))
    partie.historique.push(coupIle(1, -600)) // Bob île (-600)
    expect(partie.totalJoueur(0)).toBe(400) // 1000 - 600 = 400
  })

  it('plusieursIles_cumulatif', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.historique.push(coupIle(0, -300)) // Alice île
    partie.historique.push(coupIle(1, -500)) // Bob île
    expect(partie.totalJoueur(0)).toBe(0)
    expect(partie.totalJoueur(1)).toBe(0)
  })

  // ===== mancheActuelle =====

  it('mancheActuelle_sansJoueurs', () => {
    expect(partie.mancheActuelle()).toBe(0)
  })

  it('mancheActuelle_sansHistorique', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    expect(partie.mancheActuelle()).toBe(0)
  })

  it('mancheActuelle_aprèsUneMancheComplète', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.historique.push(coup(0, 100))
    partie.historique.push(coup(1, 200))
    expect(partie.mancheActuelle()).toBe(1)
  })

  it('mancheActuelle_pendantDeuxièmeManche', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    for (let i = 0; i < 3; i++) partie.historique.push(coup(i % 2, 100))
    expect(partie.mancheActuelle()).toBe(1)
  })

  it('mancheActuelle_deuxManchesComplètes', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    for (let i = 0; i < 4; i++) partie.historique.push(coup(i % 2, 100))
    expect(partie.mancheActuelle()).toBe(2)
  })

  it('mancheActuelle_troisJoueursUneManche', () => {
    partie.joueurs.push('A')
    partie.joueurs.push('B')
    partie.joueurs.push('C')
    for (let i = 0; i < 3; i++) partie.historique.push(coup(i, 100))
    expect(partie.mancheActuelle()).toBe(1)
  })

  // ===== manches =====

  it('manches_vide', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    expect(partie.manches().length).toBe(0)
  })

  it('manches_uneMancheComplète', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    const t0 = coup(0, 100)
    const t1 = coup(1, 200)
    partie.historique.push(t0)
    partie.historique.push(t1)
    const manches = partie.manches()
    expect(manches.length).toBe(1)
    expect(manches[0].length).toBe(2)
    expect(manches[0][0]).toEqual(t0)
    expect(manches[0][1]).toEqual(t1)
  })

  it('manches_inclusTourPartiel', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    const t0 = coup(0, 100)
    const t1 = coup(1, 200)
    const t2 = coup(0, 150)
    partie.historique.push(t0)
    partie.historique.push(t1)
    partie.historique.push(t2)
    const manches = partie.manches()
    expect(manches.length).toBe(2)
    expect(manches[0].length).toBe(2)
    expect(manches[1].length).toBe(1)
    expect(manches[1][0]).toEqual(t2)
  })

  it('manches_deuxManchesTroisJoueurs', () => {
    partie.joueurs.push('A')
    partie.joueurs.push('B')
    partie.joueurs.push('C')
    for (let i = 0; i < 6; i++) partie.historique.push(coup(i % 3, i * 100))
    const manches = partie.manches()
    expect(manches.length).toBe(2)
    expect(manches[0].length).toBe(3)
    expect(manches[1].length).toBe(3)
  })

  // ===== totalMax =====

  it('totalMax_sansJoueurs', () => {
    expect(partie.totalMax()).toBe(0)
  })

  it('totalMax_unSeulJoueur', () => {
    partie.joueurs.push('Alice')
    partie.historique.push(coup(0, 500))
    expect(partie.totalMax()).toBe(500)
  })

  it('totalMax_renvoieLePlusHaut', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.joueurs.push('Charlie')
    partie.historique.push(coup(0, 300))
    partie.historique.push(coup(1, 1200))
    partie.historique.push(coup(2, 700))
    expect(partie.totalMax()).toBe(1200)
  })

  it('totalMax_avecNegatifsCampes', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.historique.push(coup(0, -500)) // campé à 0
    partie.historique.push(coup(1, 200))
    expect(partie.totalMax()).toBe(200)
  })

  // ===== MAGIE PIRATE =====

  it('terminerParMagiePirate_estTermineeImmediatement', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.commencer()
    // Alice joue et déclenche la Magie Pirate sans avoir complété la manche
    partie.terminerParMagiePirate()
    expect(partie.estTerminee()).toBe(true)
  })

  it('magiquePirate_faux_parDefaut', () => {
    expect(partie.magiquePirate).toBe(false)
  })

  it('annulerDernier_reinitialise_magiquePirate', () => {
    partie.joueurs.push('Alice')
    partie.joueurs.push('Bob')
    partie.commencer()
    partie.ajouterCoup(coup(0, 5400))
    partie.terminerParMagiePirate()
    expect(partie.magiquePirate).toBe(true)
    partie.annulerDernier()
    expect(partie.magiquePirate).toBe(false)
  })
})
