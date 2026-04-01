package fr.ksabord.ui

import fr.ksabord.domaine.*

/** Statistiques globales d'un joueur calculées depuis l'historique des parties. */
data class StatsJoueur(
    val nom:           String,
    val victoires:     Int,
    val partiesJouées: Int,
) {
    val tauxVictoire: Int get() =
        if (partiesJouées == 0) 0 else victoires * 100 / partiesJouées
}

/** Bilan face-à-face entre deux joueurs calculé depuis l'historique des parties. */
data class StatsFaceÀFace(
    val joueur1:          String,
    val joueur2:          String,
    val victoiresJoueur1: Int,
    val victoiresJoueur2: Int,
) {
    val partiesEnsemble: Int get() = victoiresJoueur1 + victoiresJoueur2
}

/**
 * Calcule les statistiques globales de tous les joueurs apparus dans l'historique.
 * Résultat trié par victoires décroissantes, puis taux de victoire.
 */
fun calculerStatsJoueurs(): List<StatsJoueur> {
    val historique = obtenirHistoriqueParties()
    val noms = historique.flatMap { p -> p.classement.map { j -> j.nom } }.distinct()
    return noms
        .map { nom ->
            val parties   = historique.filter { p -> p.classement.any { j -> j.nom == nom } }
            val victoires = parties.count { p -> p.classement.firstOrNull()?.nom == nom }
            StatsJoueur(nom, victoires, parties.size)
        }
        .sortedWith(compareByDescending<StatsJoueur> { it.victoires }.thenByDescending { it.tauxVictoire })
}

/** Calcule le bilan face-à-face entre deux joueurs. */
fun calculerFaceÀFace(nom1: String, nom2: String): StatsFaceÀFace {
    val historique = obtenirHistoriqueParties()
    val ensemble   = historique.filter { p ->
        p.classement.any { j -> j.nom == nom1 } && p.classement.any { j -> j.nom == nom2 }
    }
    val v1 = ensemble.count { p -> p.classement.firstOrNull()?.nom == nom1 }
    val v2 = ensemble.count { p -> p.classement.firstOrNull()?.nom == nom2 }
    return StatsFaceÀFace(nom1, nom2, v1, v2)
}

/**
 * Calcule les bilans face-à-face pour toutes les paires de joueurs
 * ayant joué au moins une partie ensemble.
 */
fun calculerToutesPaires(): List<StatsFaceÀFace> {
    val joueurs = calculerStatsJoueurs().map { it.nom }
    val paires  = mutableListOf<StatsFaceÀFace>()
    for (i in joueurs.indices) {
        for (j in i + 1 until joueurs.size) {
            val faf = calculerFaceÀFace(joueurs[i], joueurs[j])
            if (faf.partiesEnsemble > 0) paires.add(faf)
        }
    }
    return paires
}
