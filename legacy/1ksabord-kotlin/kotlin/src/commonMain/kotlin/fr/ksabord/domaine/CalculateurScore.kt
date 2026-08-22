package fr.ksabord.domaine

/**
 * Service domaine pur : calcule le score d'un tour selon les règles complètes
 * de 1000 Sabords. Ne lit ni n'écrit aucun état global.
 */
fun calculerScore(des: LancerDes, carte: String): ResultatScore {
    var totalCranes = des.cranes
    if (carte == "skull1") totalCranes += 1
    if (carte == "skull2") totalCranes += 2

    val diamantsScorants = des.diamants + (if (carte == "diamond") 1 else 0)
    val orScorant        = des.or       + (if (carte == "gold")    1 else 0)

    // Magie Pirate : 8 dés identiques + le symbole de la carte = 9 symboles → victoire immédiate.
    // Uniquement possible avec la carte Diamant (9 diamants) ou Pièce d'Or (9 pièces).
    val estMagiePirate = diamantsScorants == 9 || orScorant == 9

    val estCombatNaval = carte in listOf("sea2", "sea3", "sea4")
    val sabresRequis   = when (carte) { "sea2" -> 2; "sea3" -> 3; "sea4" -> 4; else -> 0 }
    val bonusCombat    = when (carte) { "sea2" -> 300; "sea3" -> 500; "sea4" -> 1000; else -> 0 }

    // Bust (3+ cranes)
    if (totalCranes >= 3) {
        if (estCombatNaval) {
            return ResultatScore(
                score   = -bonusCombat,
                details = "💀 $totalCranes cranes — Défaite au combat! -$bonusCombat pts",
                bust    = true,
            )
        }
        if (totalCranes >= 4) {
            val penaliteParCrane = if (carte == "captain") 200 else 100
            val penaliteBase     = totalCranes * 100
            val penaliteFinale   = totalCranes * penaliteParCrane
            val details = buildString {
                append("☠️ Île de la Tête de Mort!\n")
                append("$totalCranes 💀 × 100 = -$penaliteBase")
                if (carte == "captain") {
                    append(" pts par adversaire")
                    append("\n👑 Capitaine: -$penaliteBase × 2 = -$penaliteFinale pts par adversaire")
                } else {
                    append(" pts par adversaire")
                }
            }
            return ResultatScore(
                score        = 0,
                details      = details,
                bust         = true,
                ileCranes    = true,
                nombreCranes = totalCranes,
                penaliteIle  = -penaliteFinale,
            )
        }
        return ResultatScore(score = 0, details = "💀 $totalCranes cranes — Bust!", bust = true)
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
    data class EntreeSerie(val nom: String, val compte: Int)
    val series = mutableListOf<EntreeSerie>()
    if (carte == "animals") {
        val animaux = des.singes + des.perroquets
        if (animaux > 0) series.add(EntreeSerie("🐒🦜", animaux))
    } else {
        if (des.singes     > 0) series.add(EntreeSerie("🐒", des.singes))
        if (des.perroquets > 0) series.add(EntreeSerie("🦜", des.perroquets))
    }
    if (des.sabres       > 0) series.add(EntreeSerie("⚔️", des.sabres))
    if (diamantsScorants > 0) series.add(EntreeSerie("💎", diamantsScorants))
    if (orScorant        > 0) series.add(EntreeSerie("🪙", orScorant))

    for (s in series) {
        val bonus = BONUS_SERIES[s.compte]
        if (s.compte >= 3 && bonus != null) {
            score += bonus
            ventilation.add("${s.compte}× ${s.nom} → +$bonus")
        }
    }

    // Coffre plein : tous les 8 dés contribuent au score.
    // Les cranes (même 1 ou 2) empêchent le coffre plein car ils ne rapportent pas de points.
    var toutScorant = des.cranes == 0
    if (carte == "animals") {
        val animaux = des.singes + des.perroquets
        if (animaux in 1..2) toutScorant = false
    } else {
        if (des.singes     in 1..2) toutScorant = false
        if (des.perroquets in 1..2) toutScorant = false
    }
    if (des.sabres in 1..2) toutScorant = false

    if (toutScorant && des.total == 8) {
        score += 500
        ventilation.add("🎁 Coffre plein! +500")
    }

    // Combat naval
    if (estCombatNaval) {
        return if (des.sabres >= sabresRequis) {
            score += bonusCombat
            ventilation.add("⚔️ Combat réussi! +$bonusCombat")
            finaliser(score, ventilation, carte, estMagiePirate)
        } else {
            ResultatScore(
                score   = -bonusCombat,
                details = "⚔️ Combat échoué (${des.sabres}/$sabresRequis sabres)\n-$bonusCombat pts",
                bust    = false,
            )
        }
    }

    return finaliser(score, ventilation, carte, estMagiePirate)
}

private fun finaliser(score: Int, ventilation: MutableList<String>, carte: String, magiquePirate: Boolean = false): ResultatScore {
    var s = score
    if (carte == "captain") {
        val avant = s
        s *= 2
        ventilation.add("👑 Capitaine: $avant × 2 = $s")
    }
    if (magiquePirate) {
        ventilation.add("🪄 Magie Pirate — Victoire légendaire!")
    }
    return ResultatScore(
        score          = s,
        details        = if (ventilation.isEmpty()) "Aucun point" else ventilation.joinToString("\n"),
        bust           = false,
        magiquePirate  = magiquePirate,
    )
}
