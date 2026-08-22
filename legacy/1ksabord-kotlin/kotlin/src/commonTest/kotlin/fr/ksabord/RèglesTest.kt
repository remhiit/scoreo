package fr.ksabord

import fr.ksabord.domaine.*
import kotlin.test.*

/**
 * Tests exhaustifs basés sur les règles officielles du jeu (notice "Piraten").
 * Chaque règle de la notice est couverte par au moins un test.
 * Les bugs corrigés sont marqués [RÈGLE].
 */
class ReglesTest {

    private fun des(
        cranes: Int = 0, diamants: Int = 0, or: Int = 0,
        singes: Int = 0, perroquets: Int = 0, sabres: Int = 0
    ) = LancerDes(cranes, diamants, or, singes, perroquets, sabres)

    // =========================================================
    // RÈGLE : Bust — 3 cranes ou plus = 0 point
    // =========================================================

    @Test fun bust_3Cranes_zeroPoint() {
        val r = calculerScore(des(cranes = 3, sabres = 2, singes = 2, or = 1), "none")
        assertEquals(0, r.score)
        assertTrue(r.bust)
        assertFalse(r.ileCranes)
    }

    @Test fun bust_3Cranes_pasDeSerieSupplementaire() {
        val r = calculerScore(des(cranes = 3, sabres = 5), "none")
        assertEquals(0, r.score)
        assertTrue(r.bust)
    }

    // =========================================================
    // RÈGLE : Île de la Tête de Mort — 4+ cranes au 1er lancer
    // Pénalité = -100 pts × cranes pour chaque adversaire
    // =========================================================

    @Test fun ile_4Cranes_moins400AuxAdversaires() {
        val r = calculerScore(des(cranes = 4, diamants = 2, singes = 2), "none")
        assertTrue(r.ileCranes)
        assertEquals(0, r.score)
        assertEquals(-400, r.penaliteIle)
    }

    @Test fun ile_6Cranes_moins600AuxAdversaires() {
        val r = calculerScore(des(cranes = 6, diamants = 1, or = 1), "none")
        assertTrue(r.ileCranes)
        assertEquals(-600, r.penaliteIle)
    }

    @Test fun ile_8Cranes_moins800AuxAdversaires() {
        val r = calculerScore(des(cranes = 8), "none")
        assertTrue(r.ileCranes)
        assertEquals(-800, r.penaliteIle)
    }

    // =========================================================
    // RÈGLE [BUG CORRIGÉ] : Carte Capitaine + Île de la Tête de Mort
    // → les adversaires perdent 200 pts par crâne (et non 100)
    // =========================================================

    @Test fun capitaineIle_4Cranes_pénalité200Chacun() {
        val r = calculerScore(des(cranes = 4, diamants = 2, singes = 2), "captain")
        assertTrue(r.ileCranes)
        assertEquals(0, r.score)
        assertEquals(-800, r.penaliteIle)  // 4 × 200
    }

    @Test fun capitaineIle_5Cranes_pénalité1000() {
        val r = calculerScore(des(cranes = 5, diamants = 2, or = 1), "captain")
        assertTrue(r.ileCranes)
        assertEquals(-1000, r.penaliteIle)  // 5 × 200
    }

    @Test fun capitaineIle_plusLourdeQueSansCapitaine() {
        val d = des(cranes = 4, or = 2, singes = 2)
        val avecCapitaine    = calculerScore(d, "captain")
        val sansCapitaine    = calculerScore(d, "none")
        assertTrue(avecCapitaine.penaliteIle < sansCapitaine.penaliteIle)
    }

    // =========================================================
    // RÈGLE : Combat Naval empêche l'Île de la Tête de Mort
    // =========================================================

    @Test fun combatNaval_avec4Cranes_estDefaite_pasIle() {
        val r = calculerScore(des(cranes = 4, sabres = 1, diamants = 2, or = 1), "sea2")
        assertFalse(r.ileCranes)
        assertEquals(-300, r.score)
        assertTrue(r.bust)
    }

    @Test fun combatNaval_avec8Cranes_estDefaite_pasIle() {
        val r = calculerScore(des(cranes = 8), "sea4")
        assertFalse(r.ileCranes)
        assertEquals(-1000, r.score)
    }

    @Test fun combatNaval_avec3Cranes_estDefaiteCombat_pasBustNormal() {
        val r = calculerScore(des(cranes = 3, sabres = 2, diamants = 2, or = 1), "sea2")
        assertEquals(-300, r.score)
        assertTrue(r.bust)
        assertFalse(r.ileCranes)
    }

    // =========================================================
    // RÈGLE [BUG CORRIGÉ] : Coffre au trésor plein
    // Les cranes (1-2) empêchent le coffre plein
    // =========================================================

    @Test fun pasCoffrePlein_1Crane_7Sabres() {
        val r = calculerScore(des(cranes = 1, sabres = 7), "none")
        assertEquals(2000, r.score)
        assertFalse(r.details.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_2Cranes_6Sabres() {
        val r = calculerScore(des(cranes = 2, sabres = 6), "none")
        assertEquals(1000, r.score)
        assertFalse(r.details.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_1Crane_5Sabres_2Diamants() {
        val r = calculerScore(des(cranes = 1, sabres = 5, diamants = 2), "none")
        assertEquals(700, r.score)
        assertFalse(r.details.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_1Crane_DesNonScorants() {
        val r = calculerScore(des(cranes = 1, singes = 2, sabres = 5), "none")
        assertEquals(500, r.score)
        assertFalse(r.details.contains("Coffre plein"))
    }

    @Test fun coffrePlein_4Diamants_4Or_sansCranes() {
        val r = calculerScore(des(diamants = 4, or = 4), "none")
        assertEquals(1700, r.score)  // 600 + 600 + 500
        assertTrue(r.details.contains("Coffre plein"))
    }

    // =========================================================
    // RÈGLE : Diamants et pièces d'or — 100 pts chacun + series
    // =========================================================

    @Test fun diamants_toujoursScore100Chacun() {
        val r = calculerScore(des(diamants = 1, singes = 2, perroquets = 2, sabres = 2, or = 1), "none")
        assertEquals(200, r.score)
    }

    @Test fun or_toujoursScore100Chacun() {
        assertEquals(200, calculerScore(des(or = 2, singes = 2, perroquets = 2, sabres = 2), "none").score)
    }

    @Test fun diamants_bonusSerie_plusIndividuel() {
        // 3💎 (300+100 serie) + 2🐒 (pas de serie) + 2🦜 (pas de serie) + 1🪙 (100) = 500
        // Les 2 singes et 2 perroquets empêchent le coffre plein
        val r = calculerScore(des(diamants = 3, singes = 2, perroquets = 2, or = 1), "none")
        assertEquals(500, r.score)
    }

    @Test fun or_bonusSerie_plusIndividuel() {
        // 3🪙 (300+100 serie) + 2🐒 (pas de serie) + 2🦜 (pas de serie) + 1💎 (100) = 500
        val r = calculerScore(des(or = 3, singes = 2, perroquets = 2, diamants = 1), "none")
        assertEquals(500, r.score)
    }

    // =========================================================
    // RÈGLE : Series de des identiques
    // =========================================================

    @Test fun serie_3Singes_bonus100() {
        // 3🐒 + 2🦜 (bloque coffre plein) + 1💎 + 2🪙 = 8
        // score = 100(serie 3🐒) + 100(💎) + 200(2🪙) = 400
        val r = calculerScore(des(singes = 3, perroquets = 2, diamants = 1, or = 2), "none")
        assertEquals(400, r.score)
    }

    @Test fun serie_5Sabres_bonus500() {
        val r = calculerScore(des(sabres = 5, diamants = 1, or = 1, singes = 1), "none")
        assertEquals(700, r.score)  // 100 + 100 + 500
    }

    @Test fun serie_8DesDunType_avecCoffrePlein() {
        val r = calculerScore(des(singes = 8), "none")
        assertEquals(4500, r.score)  // 4000 (serie 8) + 500 (coffre)
        assertTrue(r.details.contains("Coffre plein"))
    }

    // =========================================================
    // RÈGLE : Carte Animaux — singes et perroquets forment une serie commune
    // =========================================================

    @Test fun animaux_3Singes3Perroquets_serieCombinee() {
        // 3🐒 + 3🦜 = 6 animaux → BONUS_SÉRIES[6] = 1000
        // + 1💎 (100) + 1🪙 (100) + coffre plein (500) = 1700
        val r = calculerScore(des(singes = 3, perroquets = 3, diamants = 1, or = 1), "animals")
        assertEquals(1700, r.score)
    }

    @Test fun animaux_8Animaux_avecCoffrePlein() {
        val r = calculerScore(des(singes = 4, perroquets = 4), "animals")
        assertEquals(4500, r.score)  // 4000 + 500
    }

    // =========================================================
    // RÈGLE : Capitaine — double le score final (hors île)
    // =========================================================

    @Test fun capitaine_doubleLaVictoire() {
        val r = calculerScore(des(diamants = 3, or = 3, singes = 2), "captain")
        assertEquals(1600, r.score)  // 800 × 2
    }

    @Test fun capitaine_nestPasDouble_siBust() {
        val r = calculerScore(des(cranes = 3, sabres = 2, singes = 3), "captain")
        assertTrue(r.bust)
        assertEquals(0, r.score)
    }
}
