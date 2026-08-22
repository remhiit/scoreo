package fr.ksabord

import fr.ksabord.domaine.*
import kotlin.test.*

/**
 * Tests unitaires pour calculerScore().
 * Le service est pur : il reçoit un LancerDes et une carte, sans état global.
 */
class ScoreCalculateurTest {

    private fun des(
        cranes: Int = 0, diamants: Int = 0, or: Int = 0,
        singes: Int = 0, perroquets: Int = 0, sabres: Int = 0
    ) = LancerDes(cranes, diamants, or, singes, perroquets, sabres)

    // ===== BUST (3 cranes exactement) =====

    @Test fun bustExactement3Cranes() {
        val r = calculerScore(des(cranes = 3, diamants = 2, or = 1, singes = 2), "none")
        assertEquals(0, r.score)
        assertTrue(r.bust)
        assertFalse(r.ileCranes)
    }

    @Test fun bustAvec3CranesCarte_skull2() {
        // 1 dé crâne + carte skull2 = 3 cranes → bust (pas île car < 4)
        val r = calculerScore(des(cranes = 1, diamants = 2, singes = 3, or = 2), "skull2")
        assertTrue(r.bust)
        assertFalse(r.ileCranes)
        assertEquals(0, r.score)
    }

    // ===== ÎLE DE LA TÊTE DE MORT (4+ cranes) =====

    @Test fun ile_4Cranes() {
        val r = calculerScore(des(cranes = 4, diamants = 2, singes = 2), "none")
        assertEquals(0, r.score)
        assertTrue(r.ileCranes)
        assertEquals(-400, r.penaliteIle)
    }

    @Test fun ile_8Cranes() {
        val r = calculerScore(des(cranes = 8), "none")
        assertTrue(r.ileCranes)
        assertEquals(-800, r.penaliteIle)
    }

    @Test fun ile_skull1PasseA4() {
        // 3 des crâne + carte skull1 → 4 cranes = île
        val r = calculerScore(des(cranes = 3, diamants = 2, or = 1, singes = 2), "skull1")
        assertTrue(r.ileCranes)
        assertEquals(-400, r.penaliteIle)
    }

    @Test fun ile_skull2Avec2DesCranes() {
        // 2 des crâne + carte skull2 → 4 cranes = île
        val r = calculerScore(des(cranes = 2, diamants = 2, singes = 2, perroquets = 2), "skull2")
        assertTrue(r.ileCranes)
        assertEquals(-400, r.penaliteIle)
    }

    // ===== COMBAT NAVAL =====

    @Test fun combatNaval2_gagne() {
        // 1 crâne + 2 sabres + 1 💎 + 2 🪙 + 2 🐒 = 8 → score = 600
        val r = calculerScore(des(cranes = 1, sabres = 2, diamants = 1, or = 2, singes = 2), "sea2")
        assertFalse(r.bust)
        assertEquals(600, r.score)
    }

    @Test fun combatNaval2_perdu() {
        val r = calculerScore(des(cranes = 1, sabres = 1, diamants = 2, or = 2, singes = 2), "sea2")
        assertEquals(-300, r.score)
        assertFalse(r.bust)
    }

    @Test fun combatNaval3_gagne() {
        // 3 sabres + 2💎 + 2🪙 + 1🐒 = 8 → score = 1000
        val r = calculerScore(des(sabres = 3, diamants = 2, or = 2, singes = 1), "sea3")
        assertEquals(1000, r.score)
    }

    @Test fun combatNaval4_gagne() {
        // 4 sabres + 2💎 + 2🪙 = 8 → score = 2100
        val r = calculerScore(des(sabres = 4, diamants = 2, or = 2), "sea4")
        assertEquals(2100, r.score)
    }

    @Test fun combatNaval_bustAvec3Cranes() {
        val r = calculerScore(des(cranes = 3, sabres = 2, singes = 2, perroquets = 1), "sea2")
        assertEquals(-300, r.score)
        assertTrue(r.bust)
    }

    // ===== SÉRIES =====

    @Test fun serie3Singes() {
        // 3🐒 + 2🦜 + 1💎 + 2🪙 = 8 → score = 400
        assertEquals(400, calculerScore(des(singes = 3, perroquets = 2, diamants = 1, or = 2), "none").score)
    }

    @Test fun serie4Perroquets() {
        // 4🦜 + 2🐒 + 1💎 + 1🪙 = 8 → score = 400
        assertEquals(400, calculerScore(des(perroquets = 4, singes = 2, diamants = 1, or = 1), "none").score)
    }

    @Test fun serie3Diamants() {
        // 3💎 + 2🐒 + 2🦜 + 1🪙 = 8 → score = 500
        assertEquals(500, calculerScore(des(diamants = 3, singes = 2, perroquets = 2, or = 1), "none").score)
    }

    @Test fun serie5Sabres() {
        // 5⚔️ + 1💎 + 1🪙 + 1🐒 = 8 → score = 700
        assertEquals(700, calculerScore(des(sabres = 5, diamants = 1, or = 1, singes = 1), "none").score)
    }

    @Test fun serie8Sabres_avecCoffrePlein() {
        val r = calculerScore(des(sabres = 8), "none")
        assertEquals(4500, r.score)
        assertTrue(r.details.contains("Coffre plein"))
    }

    @Test fun serie8Diamants_avecCoffrePlein() {
        assertEquals(5300, calculerScore(des(diamants = 8), "none").score)
    }

    // ===== COFFRE PLEIN =====

    @Test fun pasCoffrePlein_avecCranes() {
        // 1💀 + 7⚔️ → serie 7 = 2000, pas de coffre plein
        val r = calculerScore(des(cranes = 1, sabres = 7), "none")
        assertEquals(2000, r.score)
        assertFalse(r.details.contains("Coffre plein"))
    }

    @Test fun pasCoffrePlein_pairesSeules() {
        val r = calculerScore(des(cranes = 1, singes = 2, sabres = 5), "none")
        assertEquals(500, r.score)
        assertFalse(r.details.contains("Coffre plein"))
    }

    // ===== CAPITAINE =====

    @Test fun capitaineDoubleLeScore() {
        // 3💎 + 3🪙 + 2🐒 = 8 → avant doublement : 800 → après : 1600
        assertEquals(1600, calculerScore(des(diamants = 3, or = 3, singes = 2), "captain").score)
    }

    @Test fun capitaineDoubleScoreIndividuel() {
        // 2🐒 + 2🦜 + 2⚔️ + 2💎 → 200 (💎) × 2 = 400
        assertEquals(400, calculerScore(des(singes = 2, perroquets = 2, sabres = 2, diamants = 2), "captain").score)
    }

    @Test fun capitaineAvecBustRenvoieNégatif() {
        val r = calculerScore(des(cranes = 3, sabres = 2, singes = 3), "captain")
        assertEquals(0, r.score)
        assertTrue(r.bust)
    }

    // ===== CARTES BONUS =====

    @Test fun carteDiamant_ajouteUnDiamantScorant() {
        // 2💎 des + carte → 3 scorants = 400(💎) + 200(🪙) = 600
        assertEquals(600, calculerScore(des(diamants = 2, or = 2, singes = 2, perroquets = 2), "diamond").score)
    }

    @Test fun carteOr_ajouteUnOrScorant() {
        assertEquals(600, calculerScore(des(or = 2, diamants = 2, singes = 2, perroquets = 2), "gold").score)
    }

    @Test fun skull1_ajouteUnCrane() {
        // 2 des crâne + carte skull1 → 3 cranes = bust
        val r = calculerScore(des(cranes = 2, diamants = 2, singes = 2, perroquets = 2), "skull1")
        assertTrue(r.bust)
        assertFalse(r.ileCranes)
    }

    @Test fun skull2_ajouteDeuxCranes() {
        // 2 des crâne + carte skull2 → 4 cranes = île
        val r = calculerScore(des(cranes = 2, diamants = 2, singes = 2, perroquets = 2), "skull2")
        assertTrue(r.ileCranes)
        assertEquals(-400, r.penaliteIle)
    }

    @Test fun carteAnimaux_combinesSingesEtPerroquets() {
        val avecAnimaux  = calculerScore(des(singes = 4, perroquets = 4), "animals")
        val sansAnimaux  = calculerScore(des(singes = 4, perroquets = 4), "none")
        // avec : 8 animaux → 4000 + 500 coffre = 4500
        assertEquals(4500, avecAnimaux.score)
        // sans : 4🐒(200) + 4🦜(200) + coffre(500) = 900
        assertEquals(900, sansAnimaux.score)
        assertTrue(avecAnimaux.score > sansAnimaux.score)
    }

    @Test fun carteAnimaux_3Singes3Perroquets() {
        val avecAnimaux = calculerScore(des(singes = 3, perroquets = 3, diamants = 1, or = 1), "animals")
        val sansAnimaux = calculerScore(des(singes = 3, perroquets = 3, diamants = 1, or = 1), "none")
        assertTrue(avecAnimaux.score > sansAnimaux.score)
    }

    @Test fun carteSorciere_sansEffetSurLeScore() {
        val d = des(diamants = 3, singes = 3, or = 2)
        assertEquals(calculerScore(d, "none").score, calculerScore(d, "witch").score)
    }

    // ===== CAS LIMITES =====

    @Test fun scoreNul_sansSerieSansDiamantsOrOr() {
        // 2🐒 + 2🦜 + 2⚔️ + 1💎 + 1🪙 = 8 → score = 200
        assertEquals(200, calculerScore(des(singes = 2, perroquets = 2, sabres = 2, diamants = 1, or = 1), "none").score)
    }

    @Test fun zeroCranes_scoreMinime() {
        // 2🐒 + 2🦜 + 2⚔️ + 2💎 = 8 → 200 (2💎 individuel)
        val r = calculerScore(des(singes = 2, perroquets = 2, sabres = 2, diamants = 2), "none")
        assertEquals(200, r.score)
        assertFalse(r.bust)
    }

    // ===== MAGIE PIRATE =====

    @Test fun magiePirate_8DiamantsCarte_diamond() {
        // 8 diamants + carte diamond = 9 diamants → Magie Pirate
        val r = calculerScore(des(diamants = 8), "diamond")
        assertTrue(r.magiquePirate)
        assertFalse(r.bust)
        // Score : 9×100 = 900 individuel + 4000 serie-9 + 500 coffre plein
        assertEquals(5400, r.score)
    }

    @Test fun magiePirate_8OrCarte_gold() {
        // 8 pièces d'or + carte gold = 9 or → Magie Pirate
        val r = calculerScore(des(or = 8), "gold")
        assertTrue(r.magiquePirate)
        assertFalse(r.bust)
        assertEquals(5400, r.score)
    }

    @Test fun pasMagiePirate_7Diamants_carteDiamond() {
        // 7 diamants + carte diamond = 8 → pas Magie Pirate
        val r = calculerScore(des(diamants = 7, singes = 1), "diamond")
        assertFalse(r.magiquePirate)
    }

    @Test fun pasMagiePirate_8Diamants_sansCarte() {
        // 8 diamants mais pas la carte diamond → 8-of-a-kind normal
        val r = calculerScore(des(diamants = 8), "none")
        assertFalse(r.magiquePirate)
        // Score : 8×100 + 4000 serie + 500 coffre plein = 5300
        assertEquals(5300, r.score)
    }

    @Test fun magiePirate_detailsMentionneVictoire() {
        val r = calculerScore(des(diamants = 8), "diamond")
        assertTrue(r.details.contains("Magie Pirate"))
    }
}
