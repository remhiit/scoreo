package fr.ksabord.domaine

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
sealed class EvenementCoup {
    abstract val joueur: String

    /**
     * Contribution nette au score du joueur [nom] pour ce coup.
     * Tient compte des pénalités île appliquées aux adversaires.
     */
    fun contributionPour(nom: String): Int = when (this) {
        is CoupCalculateur -> if (joueur == nom) score else if (ileCranes) penaliteIle else 0
        is CoupManuel      -> if (joueur == nom) score else 0
        is CoupIleCranes   -> if (joueur != nom) penaliteParAdversaire else 0
    }
}

@Serializable
@SerialName("calculateur")
data class CoupCalculateur(
    override val joueur:        String,
    val carte:                  String,
    val des:                    LancerDes,
    val score:                  Int,
    val details:                String,
    val bust:                   Boolean,
    val ileCranes:              Boolean,
    val penaliteIle:            Int,       // négatif, par adversaire ; 0 sinon
    val magiquePirate:          Boolean,
) : EvenementCoup()

@Serializable
@SerialName("manuel")
data class CoupManuel(
    override val joueur:        String,
    val scoreEntre:             Int,       // valeur saisie avant multiplicateur
    val multiplicateur:         Int,       // 1 ou 2
    val score:                  Int,       // scoreEntre × multiplicateur
) : EvenementCoup()

@Serializable
@SerialName("ile")
data class CoupIleCranes(
    override val joueur:                String,
    val nombreCranes:                   Int,
    val penaliteParAdversaire:          Int,   // négatif
    val multiplicateur:                 Int,
) : EvenementCoup()

/** Objet valeur renvoyé par le service CalculateurScore. */
data class ResultatScore(
    val score:         Int,
    val details:       String,
    val bust:          Boolean,
    val ileCranes:     Boolean = false,
    val nombreCranes:  Int     = 0,
    val penaliteIle:   Int     = 0,
    val magiquePirate: Boolean = false,
)

/** Score final d'un joueur à l'issue d'une partie. */
@Serializable
data class ResultatJoueur(
    val nom:         String,
    val score:       Int,
    val indexCouleur: Int,
)

/** Instantané d'une partie terminée, conservé dans l'historique. */
@Serializable
data class PartieTerminee(
    val uuid:           String             = "",  // identifiant unique (crypto.randomUUID en JS)
    val horodatage:     Long,
    val classement:     List<ResultatJoueur>,  // trié par score décroissant
    val nombreManches:  Int,
    val magiquePirate:  Boolean            = false,
    val coups:          List<EvenementCoup> = emptyList(),  // historique complet (event sourcing)
)
