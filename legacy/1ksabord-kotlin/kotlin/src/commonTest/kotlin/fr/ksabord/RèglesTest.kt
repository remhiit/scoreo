package fr.ksabord

import fr.ksabord.domaine.*
import kotlin.test.*

/**
 * Tests exhaustifs basés sur les règles officielles du jeu (notice "Piraten").
 * Chaque règle de la notice est couverte par au moins un test.
 * Les bugs corrigés sont marqués [RÈGLE].
 */
class RèglesTest {

    private fun dés(
        crânes: Int = 0, diamants: Int = 0, or: Int = 0,
        singes: Int = 0, perroquets: Int = 0, sabres: Int = 0
    ) = LancerDés(crânes, diamants, or, singes, perroquets, sabres)

    // =========================================================
    // RÈGLE : Bust — 3 crânes ou plus = 0 point
    // =========================================================

    @Test fun bust_3Crânes_zéroPoint() {
        val r = calculerScore(dés(crânes = 3, sabres = 2, singes = 2, or = 1), "none")
        assertEquals(0, r.score)
        assertTrue(r.bust)
        assertFalse(r.îleCrânes)
    }

    @Test fun bust_3Crânes_pasDeSérieSupplémentaire() {
        val r = calculerScore(dés(crânes = 3, sabres = 5), "none")
        assertEquals(0, r.score)
        assertTrue(r.bust)
    }

    // =========================================================
    // RÈGLE : Île de la Tête de Mort — 4+ crânes au 1er lancer
    // Pénalité = -100 pts × crânes pour chaque adversaire
    // =========================================================

    @Test fun île_4Crânes_moins400AuxAdversaires() {
        val r = calculerScore(dés(crânes = 4, diamants = 2, singes = 2), "none")
        assertTrue(r.îleCrânes)
        assertEquals(0, r.score)
        assertEquals(-400, r.pénalitéÎle)
    }

    @Test fun île_6Crânes_moins600AuxAdversaires() {
        val r = calculerScore(dés(crânes = 6, diamants = 1, or = 1), "none")
        assertTrue(r.îleCrânes)
        assertEquals(-600, r.pénalitéÎle)
    }

    @Test fun île_8Crânes_moins800AuxAdversaires() {
        val r = calculerScore(dés(crânes = 8), "none")
        assertTrue(r.îleCrânes)
        assertEquals(-800, r.pénalitéÎle)
    }

    // =========================================================
    // RÈGLE [BUG CORRIGÉ] : Carte Capitaine + Île de la Tête de Mort
    // → les adversaires perdent 200 pts par crâne (et non 100)
    // =========================================================

    @Test fun capitaineÎle_4Crânes_pénalité200Chacun() {
        val r = calculerScore(dés(crânes = 4, diamants = 2, singes = 2), "captain")
        assertTrue(r.îleCrânes)
        assertEquals(0, r.score)
        assertEquals(-800, r.pénalitéÎle)  // 4 × 200
    }

    @Test fun capitaineÎle_5Crânes_pénalité1000() {
        val r = calculerScore(dés(crânes = 5, diamants = 2, or = 1), "captain")
        assertTrue(r.îleCrânes)
        assertEquals(-1000, r.pénalitéÎle)  // 5 × 200
    }

    @Test fun capitaineÎle_plusLourdeQueSansCapitaine() {
        val d = dés(crânes = 4, or = 2, singes = 2)
        val avecCapitaine    = calculerScore(d, "captain")
        val sansCapitaine    = calculerScore(d, "none")
        assertTrue(avecCapitaine.pénalitéÎle < sansCapitaine.pénalitéÎle)
    }

    // =========================================================
    // RÈGLE : Combat Naval empêche l'Île de la Tête de Mort
    // =========================================================

    @Test fun combatNaval_avec4Crânes_estDéfaite_pasÎle() {
        val r = calculerScore(dés(crânes = 4, sabres = 1, diamants = 2, or = 1), "sea2")
        assertFalse(r.îleCrânes)
        assertEquals(-300, r.score)
        assertTrue(r.bust)
    }

    @Test fun combatNaval_avec8Crânes_estDéfaite_pasÎle() {
        val r = calculerScore(dés(crânes = 8), "sea4")
        assertFalse(r.îleCrânes)
        assertEquals(-1000, r.score)
    }

    @Test fun combatNaval_avec3Crânes_estDéfaiteCombat_pasBustNormal() {
        val r = calculerScore(dés(crânes = 3, sabres = 2, diamants = 2, or = 1), "sea2")
        assertEquals(-300, r.score)
        assertTrue(r.bust)
        assertFalse(r.îleCrânes)
    }

    // =========================================================
    // RÈGLE [BUG CORRIGÉ] : Coffre au trésor plein
    // Les crânes (1-2) empêchent le coffre plein
    // =========================================================

    @Test fun pasCoffrePlein_1Crâne_7Sabres() {
        val r = calculerScore(dés(crânes = 1, sabres = 7), "none")
        assertEquals(2000, r.score)
        assertFalse(r.détails.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_2Crânes_6Sabres() {
        val r = calculerScore(dés(crânes = 2, sabres = 6), "none")
        assertEquals(1000, r.score)
        assertFalse(r.détails.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_1Crâne_5Sabres_2Diamants() {
        val r = calculerScore(dés(crânes = 1, sabres = 5, diamants = 2), "none")
        assertEquals(700, r.score)
        assertFalse(r.détails.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_1Crâne_DésNonScorants() {
        val r = calculerScore(dés(crânes = 1, singes = 2, sabres = 5), "none")
        assertEquals(500, r.score)
        assertFalse(r.détails.contains("Coffre plein"))
    }

    @Test fun coffrePlein_4Diamants_4Or_sansCrânes() {
        val r = calculerScore(dés(diamants = 4, or = 4), "none")
        assertEquals(1700, r.score)  // 600 + 600 + 500
        assertTrue(r.détails.contains("Coffre plein"))
    }

    // =========================================================
    // RÈGLE : Diamants et pièces d'or — 100 pts chacun + séries
    // =========================================================

    @Test fun diamants_toujoursScore100Chacun() {
        val r = calculerScore(dés(diamants = 1, singes = 2, perroquets = 2, sabres = 2, or = 1), "none")
        assertEquals(200, r.score)
    }

    @Test fun or_toujoursScore100Chacun() {
        assertEquals(200, calculerScore(dés(or = 2, singes = 2, perroquets = 2, sabres = 2), "none").score)
    }

    @Test fun diamants_bonusSérie_plusIndividuel() {
        // 3💎 (300+100 série) + 2🐒 (pas de série) + 2🦜 (pas de série) + 1🪙 (100) = 500
        // Les 2 singes et 2 perroquets empêchent le coffre plein
        val r = calculerScore(dés(diamants = 3, singes = 2, perroquets = 2, or = 1), "none")
        assertEquals(500, r.score)
    }

    @Test fun or_bonusSérie_plusIndividuel() {
        // 3🪙 (300+100 série) + 2🐒 (pas de série) + 2🦜 (pas de série) + 1💎 (100) = 500
        val r = calculerScore(dés(or = 3, singes = 2, perroquets = 2, diamants = 1), "none")
        assertEquals(500, r.score)
    }

    // =========================================================
    // RÈGLE : Séries de dés identiques
    // =========================================================

    @Test fun série_3Singes_bonus100() {
        // 3🐒 + 2🦜 (bloque coffre plein) + 1💎 + 2🪙 = 8
        // score = 100(série 3🐒) + 100(💎) + 200(2🪙) = 400
        val r = calculerScore(dés(singes = 3, perroquets = 2, diamants = 1, or = 2), "none")
        assertEquals(400, r.score)
    }

    @Test fun série_5Sabres_bonus500() {
        val r = calculerScore(dés(sabres = 5, diamants = 1, or = 1, singes = 1), "none")
        assertEquals(700, r.score)  // 100 + 100 + 500
    }

    @Test fun série_8DésDunType_avecCoffrePlein() {
        val r = calculerScore(dés(singes = 8), "none")
        assertEquals(4500, r.score)  // 4000 (série 8) + 500 (coffre)
        assertTrue(r.détails.contains("Coffre plein"))
    }

    // =========================================================
    // RÈGLE : Carte Animaux — singes et perroquets forment une série commune
    // =========================================================

    @Test fun animaux_3Singes3Perroquets_sérieCombinée() {
        // 3🐒 + 3🦜 = 6 animaux → BONUS_SÉRIES[6] = 1000
        // + 1💎 (100) + 1🪙 (100) + coffre plein (500) = 1700
        val r = calculerScore(dés(singes = 3, perroquets = 3, diamants = 1, or = 1), "animals")
        assertEquals(1700, r.score)
    }

    @Test fun animaux_8Animaux_avecCoffrePlein() {
        val r = calculerScore(dés(singes = 4, perroquets = 4), "animals")
        assertEquals(4500, r.score)  // 4000 + 500
    }

    // =========================================================
    // RÈGLE : Capitaine — double le score final (hors île)
    // =========================================================

    @Test fun capitaine_doubleLaVictoire() {
        val r = calculerScore(dés(diamants = 3, or = 3, singes = 2), "captain")
        assertEquals(1600, r.score)  // 800 × 2
    }

    @Test fun capitaine_nestPasDoublé_siBust() {
        val r = calculerScore(dés(crânes = 3, sabres = 2, singes = 3), "captain")
        assertTrue(r.bust)
        assertEquals(0, r.score)
    }
}
