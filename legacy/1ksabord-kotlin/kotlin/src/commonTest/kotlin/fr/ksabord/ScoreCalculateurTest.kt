package fr.ksabord

import fr.ksabord.domaine.*
import kotlin.test.*

/**
 * Tests unitaires pour calculerScore().
 * Le service est pur : il reçoit un LancerDés et une carte, sans état global.
 */
class ScoreCalculateurTest {

    private fun dés(
        crânes: Int = 0, diamants: Int = 0, or: Int = 0,
        singes: Int = 0, perroquets: Int = 0, sabres: Int = 0
    ) = LancerDés(crânes, diamants, or, singes, perroquets, sabres)

    // ===== BUST (3 crânes exactement) =====

    @Test fun bustExactement3Crânes() {
        val r = calculerScore(dés(crânes = 3, diamants = 2, or = 1, singes = 2), "none")
        assertEquals(0, r.score)
        assertTrue(r.bust)
        assertFalse(r.îleCrânes)
    }

    @Test fun bustAvec3CrânesCarte_skull2() {
        // 1 dé crâne + carte skull2 = 3 crânes → bust (pas île car < 4)
        val r = calculerScore(dés(crânes = 1, diamants = 2, singes = 3, or = 2), "skull2")
        assertTrue(r.bust)
        assertFalse(r.îleCrânes)
        assertEquals(0, r.score)
    }

    // ===== ÎLE DE LA TÊTE DE MORT (4+ crânes) =====

    @Test fun île_4Crânes() {
        val r = calculerScore(dés(crânes = 4, diamants = 2, singes = 2), "none")
        assertEquals(0, r.score)
        assertTrue(r.îleCrânes)
        assertEquals(-400, r.pénalitéÎle)
    }

    @Test fun île_8Crânes() {
        val r = calculerScore(dés(crânes = 8), "none")
        assertTrue(r.îleCrânes)
        assertEquals(-800, r.pénalitéÎle)
    }

    @Test fun île_skull1PasseÀ4() {
        // 3 dés crâne + carte skull1 → 4 crânes = île
        val r = calculerScore(dés(crânes = 3, diamants = 2, or = 1, singes = 2), "skull1")
        assertTrue(r.îleCrânes)
        assertEquals(-400, r.pénalitéÎle)
    }

    @Test fun île_skull2Avec2DésCrânes() {
        // 2 dés crâne + carte skull2 → 4 crânes = île
        val r = calculerScore(dés(crânes = 2, diamants = 2, singes = 2, perroquets = 2), "skull2")
        assertTrue(r.îleCrânes)
        assertEquals(-400, r.pénalitéÎle)
    }

    // ===== COMBAT NAVAL =====

    @Test fun combatNaval2_gagné() {
        // 1 crâne + 2 sabres + 1 💎 + 2 🪙 + 2 🐒 = 8 → score = 600
        val r = calculerScore(dés(crânes = 1, sabres = 2, diamants = 1, or = 2, singes = 2), "sea2")
        assertFalse(r.bust)
        assertEquals(600, r.score)
    }

    @Test fun combatNaval2_perdu() {
        val r = calculerScore(dés(crânes = 1, sabres = 1, diamants = 2, or = 2, singes = 2), "sea2")
        assertEquals(-300, r.score)
        assertFalse(r.bust)
    }

    @Test fun combatNaval3_gagné() {
        // 3 sabres + 2💎 + 2🪙 + 1🐒 = 8 → score = 1000
        val r = calculerScore(dés(sabres = 3, diamants = 2, or = 2, singes = 1), "sea3")
        assertEquals(1000, r.score)
    }

    @Test fun combatNaval4_gagné() {
        // 4 sabres + 2💎 + 2🪙 = 8 → score = 2100
        val r = calculerScore(dés(sabres = 4, diamants = 2, or = 2), "sea4")
        assertEquals(2100, r.score)
    }

    @Test fun combatNaval_bustAvec3Crânes() {
        val r = calculerScore(dés(crânes = 3, sabres = 2, singes = 2, perroquets = 1), "sea2")
        assertEquals(-300, r.score)
        assertTrue(r.bust)
    }

    // ===== SÉRIES =====

    @Test fun série3Singes() {
        // 3🐒 + 2🦜 + 1💎 + 2🪙 = 8 → score = 400
        assertEquals(400, calculerScore(dés(singes = 3, perroquets = 2, diamants = 1, or = 2), "none").score)
    }

    @Test fun série4Perroquets() {
        // 4🦜 + 2🐒 + 1💎 + 1🪙 = 8 → score = 400
        assertEquals(400, calculerScore(dés(perroquets = 4, singes = 2, diamants = 1, or = 1), "none").score)
    }

    @Test fun série3Diamants() {
        // 3💎 + 2🐒 + 2🦜 + 1🪙 = 8 → score = 500
        assertEquals(500, calculerScore(dés(diamants = 3, singes = 2, perroquets = 2, or = 1), "none").score)
    }

    @Test fun série5Sabres() {
        // 5⚔️ + 1💎 + 1🪙 + 1🐒 = 8 → score = 700
        assertEquals(700, calculerScore(dés(sabres = 5, diamants = 1, or = 1, singes = 1), "none").score)
    }

    @Test fun série8Sabres_avecCoffrePlein() {
        val r = calculerScore(dés(sabres = 8), "none")
        assertEquals(4500, r.score)
        assertTrue(r.détails.contains("Coffre plein"))
    }

    @Test fun série8Diamants_avecCoffrePlein() {
        assertEquals(5300, calculerScore(dés(diamants = 8), "none").score)
    }

    // ===== COFFRE PLEIN =====

    @Test fun pasCoffrePlein_avecCrânes() {
        // 1💀 + 7⚔️ → série 7 = 2000, pas de coffre plein
        val r = calculerScore(dés(crânes = 1, sabres = 7), "none")
        assertEquals(2000, r.score)
        assertFalse(r.détails.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_pairesSeules() {
        val r = calculerScore(dés(crânes = 1, singes = 2, sabres = 5), "none")
        assertEquals(500, r.score)
        assertFalse(r.détails.contains("Coffre plein"))
    }

    // ===== CAPITAINE =====

    @Test fun capitaineDoubleLeScore() {
        // 3💎 + 3🪙 + 2🐒 = 8 → avant doublement : 800 → après : 1600
        assertEquals(1600, calculerScore(dés(diamants = 3, or = 3, singes = 2), "captain").score)
    }

    @Test fun capitaineDoubleScoreIndividuel() {
        // 2🐒 + 2🦜 + 2⚔️ + 2💎 → 200 (💎) × 2 = 400
        assertEquals(400, calculerScore(dés(singes = 2, perroquets = 2, sabres = 2, diamants = 2), "captain").score)
    }

    @Test fun capitaineAvecBustRenvoieNégatif() {
        val r = calculerScore(dés(crânes = 3, sabres = 2, singes = 3), "captain")
        assertEquals(0, r.score)
        assertTrue(r.bust)
    }

    // ===== CARTES BONUS =====

    @Test fun carteDiamant_ajouteUnDiamantScorant() {
        // 2💎 dés + carte → 3 scorants = 400(💎) + 200(🪙) = 600
        assertEquals(600, calculerScore(dés(diamants = 2, or = 2, singes = 2, perroquets = 2), "diamond").score)
    }

    @Test fun carteOr_ajouteUnOrScorant() {
        assertEquals(600, calculerScore(dés(or = 2, diamants = 2, singes = 2, perroquets = 2), "gold").score)
    }

    @Test fun skull1_ajouteUnCrâne() {
        // 2 dés crâne + carte skull1 → 3 crânes = bust
        val r = calculerScore(dés(crânes = 2, diamants = 2, singes = 2, perroquets = 2), "skull1")
        assertTrue(r.bust)
        assertFalse(r.îleCrânes)
    }

    @Test fun skull2_ajouteDeuxCrânes() {
        // 2 dés crâne + carte skull2 → 4 crânes = île
        val r = calculerScore(dés(crânes = 2, diamants = 2, singes = 2, perroquets = 2), "skull2")
        assertTrue(r.îleCrânes)
        assertEquals(-400, r.pénalitéÎle)
    }

    @Test fun carteAnimaux_combinesSingesEtPerroquets() {
        val avecAnimaux  = calculerScore(dés(singes = 4, perroquets = 4), "animals")
        val sansAnimaux  = calculerScore(dés(singes = 4, perroquets = 4), "none")
        // avec : 8 animaux → 4000 + 500 coffre = 4500
        assertEquals(4500, avecAnimaux.score)
        // sans : 4🐒(200) + 4🦜(200) + coffre(500) = 900
        assertEquals(900, sansAnimaux.score)
        assertTrue(avecAnimaux.score > sansAnimaux.score)
    }

    @Test fun carteAnimaux_3Singes3Perroquets() {
        val avecAnimaux = calculerScore(dés(singes = 3, perroquets = 3, diamants = 1, or = 1), "animals")
        val sansAnimaux = calculerScore(dés(singes = 3, perroquets = 3, diamants = 1, or = 1), "none")
        assertTrue(avecAnimaux.score > sansAnimaux.score)
    }

    @Test fun carteSorcière_sansEffetSurLeScore() {
        val d = dés(diamants = 3, singes = 3, or = 2)
        assertEquals(calculerScore(d, "none").score, calculerScore(d, "witch").score)
    }

    // ===== CAS LIMITES =====

    @Test fun scoreNul_sansSérieSansDiamantsOrOr() {
        // 2🐒 + 2🦜 + 2⚔️ + 1💎 + 1🪙 = 8 → score = 200
        assertEquals(200, calculerScore(dés(singes = 2, perroquets = 2, sabres = 2, diamants = 1, or = 1), "none").score)
    }

    @Test fun zéroCrânes_scoreMinime() {
        // 2🐒 + 2🦜 + 2⚔️ + 2💎 = 8 → 200 (2💎 individuel)
        val r = calculerScore(dés(singes = 2, perroquets = 2, sabres = 2, diamants = 2), "none")
        assertEquals(200, r.score)
        assertFalse(r.bust)
    }

    // ===== MAGIE PIRATE =====

    @Test fun magiePirate_8DiamantsCarte_diamond() {
        // 8 diamants + carte diamond = 9 diamants → Magie Pirate
        val r = calculerScore(dés(diamants = 8), "diamond")
        assertTrue(r.magiquePirate)
        assertFalse(r.bust)
        // Score : 9×100 = 900 individuel + 4000 série-9 + 500 coffre plein
        assertEquals(5400, r.score)
    }

    @Test fun magiePirate_8OrCarte_gold() {
        // 8 pièces d'or + carte gold = 9 or → Magie Pirate
        val r = calculerScore(dés(or = 8), "gold")
        assertTrue(r.magiquePirate)
        assertFalse(r.bust)
        assertEquals(5400, r.score)
    }

    @Test fun pasMagiePirate_7Diamants_carteDiamond() {
        // 7 diamants + carte diamond = 8 → pas Magie Pirate
        val r = calculerScore(dés(diamants = 7, singes = 1), "diamond")
        assertFalse(r.magiquePirate)
    }

    @Test fun pasMagiePirate_8Diamants_sansCarte() {
        // 8 diamants mais pas la carte diamond → 8-of-a-kind normal
        val r = calculerScore(dés(diamants = 8), "none")
        assertFalse(r.magiquePirate)
        // Score : 8×100 + 4000 série + 500 coffre plein = 5300
        assertEquals(5300, r.score)
    }

    @Test fun magiePirate_détailsMentionneVictoire() {
        val r = calculerScore(dés(diamants = 8), "diamond")
        assertTrue(r.détails.contains("Magie Pirate"))
    }
}
