package fr.ksabord.domaine

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
sealed class ÉvénementCoup {
    abstract val joueur: String

    /**
     * Contribution nette au score du joueur [nom] pour ce coup.
     * Tient compte des pénalités île appliquées aux adversaires.
     */
    fun contributionPour(nom: String): Int = when (this) {
        is CoupCalculateur -> if (joueur == nom) score else if (îleCrânes) pénalitéÎle else 0
        is CoupManuel      -> if (joueur == nom) score else 0
        is CoupÎleCrânes   -> if (joueur != nom) pénalitéParAdversaire else 0
    }
}

@Serializable
@SerialName("calculateur")
data class CoupCalculateur(
    override val joueur:        String,
    val carte:                  String,
    val dés:                    LancerDés,
    val score:                  Int,
    val détails:                String,
    val bust:                   Boolean,
    val îleCrânes:              Boolean,
    val pénalitéÎle:            Int,       // négatif, par adversaire ; 0 sinon
    val magiquePirate:          Boolean,
) : ÉvénementCoup()

@Serializable
@SerialName("manuel")
data class CoupManuel(
    override val joueur:        String,
    val scoreEntré:             Int,       // valeur saisie avant multiplicateur
    val multiplicateur:         Int,       // 1 ou 2
    val score:                  Int,       // scoreEntré × multiplicateur
) : ÉvénementCoup()

@Serializable
@SerialName("ile")
data class CoupÎleCrânes(
    override val joueur:                String,
    val nombreCrânes:                   Int,
    val pénalitéParAdversaire:          Int,   // négatif
    val multiplicateur:                 Int,
) : ÉvénementCoup()

/** Objet valeur renvoyé par le service CalculateurScore. */
data class RésultatScore(
    val score:         Int,
    val détails:       String,
    val bust:          Boolean,
    val îleCrânes:     Boolean = false,
    val nombreCrânes:  Int     = 0,
    val pénalitéÎle:   Int     = 0,
    val magiquePirate: Boolean = false,
)

/** Score final d'un joueur à l'issue d'une partie. */
@Serializable
data class RésultatJoueur(
    val nom:         String,
    val score:       Int,
    val indexCouleur: Int,
)

/** Instantané d'une partie terminée, conservé dans l'historique. */
@Serializable
data class PartieTerminée(
    val horodatage:     Long,
    val classement:     List<RésultatJoueur>,  // trié par score décroissant
    val nombreManches:  Int,
    val magiquePirate:  Boolean            = false,
    val coups:          List<ÉvénementCoup> = emptyList(),  // historique complet (event sourcing)
)
