package fr.ksabord.domaine

/**
 * Service domaine pur : calcule le score d'un tour selon les règles complètes
 * de 1000 Sabords. Ne lit ni n'écrit aucun état global.
 */
fun calculerScore(dés: LancerDés, carte: String): RésultatScore {
    var totalCrânes = dés.crânes
    if (carte == "skull1") totalCrânes += 1
    if (carte == "skull2") totalCrânes += 2

    val diamantsScorants = dés.diamants + (if (carte == "diamond") 1 else 0)
    val orScorant        = dés.or       + (if (carte == "gold")    1 else 0)

    // Magie Pirate : 8 dés identiques + le symbole de la carte = 9 symboles → victoire immédiate.
    // Uniquement possible avec la carte Diamant (9 diamants) ou Pièce d'Or (9 pièces).
    val estMagiePirate = diamantsScorants == 9 || orScorant == 9

    val estCombatNaval = carte in listOf("sea2", "sea3", "sea4")
    val sabresRequis   = when (carte) { "sea2" -> 2; "sea3" -> 3; "sea4" -> 4; else -> 0 }
    val bonusCombat    = when (carte) { "sea2" -> 300; "sea3" -> 500; "sea4" -> 1000; else -> 0 }

    // Bust (3+ crânes)
    if (totalCrânes >= 3) {
        if (estCombatNaval) {
            return RésultatScore(
                score   = -bonusCombat,
                détails = "💀 $totalCrânes crânes — Défaite au combat! -$bonusCombat pts",
                bust    = true,
            )
        }
        if (totalCrânes >= 4) {
            val pénalitéParCrâne = if (carte == "captain") 200 else 100
            val pénalitéBase     = totalCrânes * 100
            val pénalitéFinale   = totalCrânes * pénalitéParCrâne
            val détails = buildString {
                append("☠️ Île de la Tête de Mort!\n")
                append("$totalCrânes 💀 × 100 = -$pénalitéBase")
                if (carte == "captain") {
                    append(" pts par adversaire")
                    append("\n👑 Capitaine: -$pénalitéBase × 2 = -$pénalitéFinale pts par adversaire")
                } else {
                    append(" pts par adversaire")
                }
            }
            return RésultatScore(
                score        = 0,
                détails      = détails,
                bust         = true,
                îleCrânes    = true,
                nombreCrânes = totalCrânes,
                pénalitéÎle  = -pénalitéFinale,
            )
        }
        return RésultatScore(score = 0, détails = "💀 $totalCrânes crânes — Bust!", bust = true)
    }

    var score = 0
    val ventilation = mutableListOf<String>()

    // Diamants et pièces d'or (100 pts chacun)
    if (diamantsScorants > 0) {
        score += diamantsScorants * 100
        ventilation.add("${diamantsScorants}× 💎 = ${diamantsScorants * 100}")
    }
    if (orScorant > 0) {
        score += orScorant * 100
        ventilation.add("${orScorant}× 🪙 = ${orScorant * 100}")
    }

    // Séries
    data class EntréeSérie(val nom: String, val compte: Int)
    val séries = mutableListOf<EntréeSérie>()
    if (carte == "animals") {
        val animaux = dés.singes + dés.perroquets
        if (animaux > 0) séries.add(EntréeSérie("🐒🦜", animaux))
    } else {
        if (dés.singes     > 0) séries.add(EntréeSérie("🐒", dés.singes))
        if (dés.perroquets > 0) séries.add(EntréeSérie("🦜", dés.perroquets))
    }
    if (dés.sabres       > 0) séries.add(EntréeSérie("⚔️", dés.sabres))
    if (diamantsScorants > 0) séries.add(EntréeSérie("💎", diamantsScorants))
    if (orScorant        > 0) séries.add(EntréeSérie("🪙", orScorant))

    for (s in séries) {
        val bonus = BONUS_SÉRIES[s.compte]
        if (s.compte >= 3 && bonus != null) {
            score += bonus
            ventilation.add("${s.compte}× ${s.nom} → +$bonus")
        }
    }

    // Coffre plein : tous les 8 dés contribuent au score.
    // Les crânes (même 1 ou 2) empêchent le coffre plein car ils ne rapportent pas de points.
    var toutScorant = dés.crânes == 0
    if (carte == "animals") {
        val animaux = dés.singes + dés.perroquets
        if (animaux in 1..2) toutScorant = false
    } else {
        if (dés.singes     in 1..2) toutScorant = false
        if (dés.perroquets in 1..2) toutScorant = false
    }
    if (dés.sabres in 1..2) toutScorant = false

    if (toutScorant && dés.total == 8) {
        score += 500
        ventilation.add("🎁 Coffre plein! +500")
    }

    // Combat naval
    if (estCombatNaval) {
        return if (dés.sabres >= sabresRequis) {
            score += bonusCombat
            ventilation.add("⚔️ Combat réussi! +$bonusCombat")
            finaliser(score, ventilation, carte, estMagiePirate)
        } else {
            RésultatScore(
                score   = -bonusCombat,
                détails = "⚔️ Combat échoué (${dés.sabres}/$sabresRequis sabres)\n-$bonusCombat pts",
                bust    = false,
            )
        }
    }

    return finaliser(score, ventilation, carte, estMagiePirate)
}

private fun finaliser(score: Int, ventilation: MutableList<String>, carte: String, magiquePirate: Boolean = false): RésultatScore {
    var s = score
    if (carte == "captain") {
        val avant = s
        s *= 2
        ventilation.add("👑 Capitaine: $avant × 2 = $s")
    }
    if (magiquePirate) {
        ventilation.add("🪄 Magie Pirate — Victoire légendaire!")
    }
    return RésultatScore(
        score          = s,
        détails        = if (ventilation.isEmpty()) "Aucun point" else ventilation.joinToString("\n"),
        bust           = false,
        magiquePirate  = magiquePirate,
    )
}
