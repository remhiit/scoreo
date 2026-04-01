package fr.ksabord

import fr.ksabord.domaine.*
import kotlin.test.*

/**
 * Tests unitaires pour les méthodes de la Partie :
 * totalJoueur, mancheActuelle, manches, totalMax.
 */
class EtatTest {

    @BeforeTest
    fun setUp() {
        partie.réinitialiser()
    }

    private fun coup(indexJoueur: Int, score: Int): CoupManuel =
        CoupManuel(
            joueur         = partie.joueurs[indexJoueur],
            scoreEntré     = score,
            multiplicateur = 1,
            score          = score,
        )

    private fun coupÎle(indexJoueur: Int, pénalité: Int, crânes: Int = (-pénalité / 100)): CoupÎleCrânes =
        CoupÎleCrânes(
            joueur                = partie.joueurs[indexJoueur],
            nombreCrânes          = crânes,
            pénalitéParAdversaire = pénalité,
            multiplicateur        = 1,
        )

    // ===== totalJoueur =====

    @Test fun totalJoueur_historiqueVide() {
        partie.joueurs.add("Alice")
        assertEquals(0, partie.totalJoueur(0))
    }

    @Test fun totalJoueur_sommeSesScores() {
        partie.joueurs.add("Alice")
        partie.historique.add(coup(0, 100))
        partie.historique.add(coup(0, 250))
        assertEquals(350, partie.totalJoueur(0))
    }

    @Test fun totalJoueur_ignoreAutresJoueurs() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.historique.add(coup(0, 300))
        partie.historique.add(coup(1, 500))
        assertEquals(300, partie.totalJoueur(0))
        assertEquals(500, partie.totalJoueur(1))
    }

    @Test fun totalJoueur_bloquéÀZéro() {
        partie.joueurs.add("Alice")
        partie.historique.add(coup(0, -500))
        assertEquals(0, partie.totalJoueur(0))
    }

    @Test fun totalJoueur_repriseAprèsClamp() {
        partie.joueurs.add("Alice")
        partie.historique.add(coup(0, -500))
        partie.historique.add(coup(0, 300))
        assertEquals(300, partie.totalJoueur(0))
    }

    @Test fun totalJoueur_clampCumulatifParTour() {
        partie.joueurs.add("Alice")
        partie.historique.add(coup(0, -200))
        partie.historique.add(coup(0, -150))
        partie.historique.add(coup(0, 400))
        assertEquals(400, partie.totalJoueur(0))
    }

    // ===== Île de la Tête de Mort (îleCrânes) =====

    @Test fun île_pénalitéAppliquéeAuxAutres() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.historique.add(coup(0, 200))                            // Alice +200
        partie.historique.add(coup(1, 100))                            // Bob +100
        partie.historique.add(coupÎle(0, -300))                        // Alice île → -300 aux autres
        // Bob : 100 + (-300) = -200 → clamp → 0
        assertEquals(0,   partie.totalJoueur(1))
        // Alice : 200 (pas de pénalité sur soi-même)
        assertEquals(200, partie.totalJoueur(0))
    }

    @Test fun île_joueurNePerdPasLuiMême() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.historique.add(coupÎle(1, -400))  // Bob île
        assertEquals(0, partie.totalJoueur(1))   // Bob : score île = 0
        assertEquals(0, partie.totalJoueur(0))   // Alice : 0 + (-400) → clamp
    }

    @Test fun île_pénalitéRespecteLeCamp() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.historique.add(coup(0, 1000))
        partie.historique.add(coupÎle(1, -600))  // Bob île (-600)
        assertEquals(400, partie.totalJoueur(0))  // 1000 - 600 = 400
    }

    @Test fun plusieursÎles_cumulatif() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.historique.add(coupÎle(0, -300))  // Alice île
        partie.historique.add(coupÎle(1, -500))  // Bob île
        assertEquals(0, partie.totalJoueur(0))
        assertEquals(0, partie.totalJoueur(1))
    }

    // ===== mancheActuelle =====

    @Test fun mancheActuelle_sansJoueurs() {
        assertEquals(0, partie.mancheActuelle())
    }

    @Test fun mancheActuelle_sansHistorique() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        assertEquals(0, partie.mancheActuelle())
    }

    @Test fun mancheActuelle_aprèsUneMancheComplète() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.historique.add(coup(0, 100)); partie.historique.add(coup(1, 200))
        assertEquals(1, partie.mancheActuelle())
    }

    @Test fun mancheActuelle_pendantDeuxièmeManche() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        repeat(3) { i -> partie.historique.add(coup(i % 2, 100)) }
        assertEquals(1, partie.mancheActuelle())
    }

    @Test fun mancheActuelle_deuxManchesComplètes() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        repeat(4) { i -> partie.historique.add(coup(i % 2, 100)) }
        assertEquals(2, partie.mancheActuelle())
    }

    @Test fun mancheActuelle_troisJoueursUneManche() {
        partie.joueurs.add("A"); partie.joueurs.add("B"); partie.joueurs.add("C")
        repeat(3) { i -> partie.historique.add(coup(i, 100)) }
        assertEquals(1, partie.mancheActuelle())
    }

    // ===== manches =====

    @Test fun manches_vide() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        assertEquals(0, partie.manches().size)
    }

    @Test fun manches_uneMancheComplète() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        val t0 = coup(0, 100); val t1 = coup(1, 200)
        partie.historique.add(t0); partie.historique.add(t1)
        val manches = partie.manches()
        assertEquals(1, manches.size)
        assertEquals(2, manches[0].size)
        assertEquals(t0, manches[0][0])
        assertEquals(t1, manches[0][1])
    }

    @Test fun manches_inclusTourPartiel() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        val t0 = coup(0, 100); val t1 = coup(1, 200); val t2 = coup(0, 150)
        partie.historique.add(t0); partie.historique.add(t1); partie.historique.add(t2)
        val manches = partie.manches()
        assertEquals(2, manches.size)
        assertEquals(2, manches[0].size)
        assertEquals(1, manches[1].size)
        assertEquals(t2, manches[1][0])
    }

    @Test fun manches_deuxManchesTroisJoueurs() {
        partie.joueurs.add("A"); partie.joueurs.add("B"); partie.joueurs.add("C")
        repeat(6) { i -> partie.historique.add(coup(i % 3, i * 100)) }
        val manches = partie.manches()
        assertEquals(2, manches.size)
        assertEquals(3, manches[0].size)
        assertEquals(3, manches[1].size)
    }

    // ===== totalMax =====

    @Test fun totalMax_sansJoueurs() {
        assertEquals(0, partie.totalMax())
    }

    @Test fun totalMax_unSeulJoueur() {
        partie.joueurs.add("Alice")
        partie.historique.add(coup(0, 500))
        assertEquals(500, partie.totalMax())
    }

    @Test fun totalMax_renvoieLePlusHaut() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob"); partie.joueurs.add("Charlie")
        partie.historique.add(coup(0, 300))
        partie.historique.add(coup(1, 1200))
        partie.historique.add(coup(2, 700))
        assertEquals(1200, partie.totalMax())
    }

    @Test fun totalMax_avecNégatifsCampés() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.historique.add(coup(0, -500))  // campé à 0
        partie.historique.add(coup(1, 200))
        assertEquals(200, partie.totalMax())
    }

    // ===== MAGIE PIRATE =====

    @Test fun terminerParMagiePirate_estTerminéeImmédiatement() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.commencer()
        // Alice joue et déclenche la Magie Pirate sans avoir complété la manche
        partie.terminerParMagiePirate()
        assertTrue(partie.estTerminée())
    }

    @Test fun magiquePirate_faux_parDéfaut() {
        assertFalse(partie.magiquePirate)
    }

    @Test fun réinitialiser_réinitialise_magiquePirate() {
        partie.terminerParMagiePirate()
        partie.réinitialiser()
        assertFalse(partie.magiquePirate)
    }

    @Test fun annulerDernier_réinitialise_magiquePirate() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.commencer()
        partie.ajouterCoup(coup(0, 5400))
        partie.terminerParMagiePirate()
        assertTrue(partie.magiquePirate)
        partie.annulerDernier()
        assertFalse(partie.magiquePirate)
    }
}
