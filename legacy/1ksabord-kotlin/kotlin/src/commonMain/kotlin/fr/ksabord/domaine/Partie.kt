package fr.ksabord.domaine

/**
 * Racine d'agrégat du jeu.
 * Encapsule l'intégralité de l'état d'une partie : joueurs, historique des tours,
 * tour actuel et indicateur de dernier tour.
 */
class Partie {
    val joueurs              = mutableListOf<String>()
    val historique           = mutableListOf<EvenementCoup>()
    var indexJoueurActuel: Int = 0
    var dernierTour: Boolean   = false
    var numeroDernierTour: Int = -1
    var commencee: Boolean     = false
    var magiquePirate: Boolean = false

    // ==================== Requêtes ====================

    private fun totalJoueurParNom(nom: String): Int =
        historique.fold(0) { acc, ev -> maxOf(0, acc + ev.contributionPour(nom)) }

    fun totalJoueur(index: Int): Int = totalJoueurParNom(joueurs[index])

    fun mancheActuelle(): Int {
        if (joueurs.isEmpty()) return 0
        return historique.size / joueurs.size
    }

    fun totalMax(): Int = joueurs.indices.maxOfOrNull { totalJoueur(it) } ?: 0

    fun manches(): List<List<EvenementCoup>> {
        val resultat = mutableListOf<List<EvenementCoup>>()
        val n = joueurs.size
        var i = 0
        while (i < historique.size) {
            resultat.add(historique.subList(i, minOf(i + n, historique.size)).toList())
            i += n
        }
        return resultat
    }

    // ==================== Commandes ====================

    fun commencer() {
        commencee = true
        indexJoueurActuel = 0
        historique.clear()
        dernierTour = false
        numeroDernierTour = -1
        magiquePirate = false
    }

    fun ajouterCoup(coup: EvenementCoup) {
        historique.add(coup)
        if (!dernierTour) {
            for (nom in joueurs) {
                if (totalJoueurParNom(nom) >= 6000) {
                    dernierTour = true
                    numeroDernierTour = mancheActuelle()
                    break
                }
            }
        }
        indexJoueurActuel = (indexJoueurActuel + 1) % joueurs.size
    }

    fun annulerDernier() {
        if (historique.isEmpty()) return
        historique.removeAt(historique.lastIndex)
        indexJoueurActuel = if (indexJoueurActuel == 0) joueurs.size - 1 else indexJoueurActuel - 1
        dernierTour = false
        numeroDernierTour = -1
        magiquePirate = false
        for (h in historique.indices) {
            if (!dernierTour) {
                val depasseSeuil = joueurs.any { nom ->
                    var t = 0
                    for (j in 0..h) t = maxOf(0, t + historique[j].contributionPour(nom))
                    t >= 6000
                }
                if (depasseSeuil) {
                    dernierTour = true
                    numeroDernierTour = (h + 1) / joueurs.size
                }
            }
        }
    }

    fun reinitialiser() {
        joueurs.clear()
        historique.clear()
        indexJoueurActuel = 0
        dernierTour = false
        numeroDernierTour = -1
        commencee = false
        magiquePirate = false
    }

    /** Déclenche une victoire immédiate par Magie Pirate (sans attendre la fin de manche). */
    fun terminerParMagiePirate() {
        magiquePirate = true
    }

    /** Vrai quand toutes les manches du dernier tour ont été jouées, ou si Magie Pirate. */
    fun estTerminee(): Boolean {
        if (magiquePirate) return true
        if (!dernierTour || joueurs.isEmpty()) return false
        return mancheActuelle() > numeroDernierTour && historique.size % joueurs.size == 0
    }
}

/** Singleton partagé entre tous les composants de la plateforme active. */
val partie = Partie()
