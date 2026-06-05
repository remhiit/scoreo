package fr.ksabord.domaine

import kotlinx.serialization.Serializable

/**
 * Objet valeur immutable représentant les dés lancés lors d'un tour.
 * Toutes les propriétés sont en lecture seule — une modification produit une copie.
 */
@Serializable
data class LancerDes(
    val cranes:     Int = 0,
    val diamants:   Int = 0,
    val or:         Int = 0,
    val singes:     Int = 0,
    val perroquets: Int = 0,
    val sabres:     Int = 0,
) {
    val total: Int get() = cranes + diamants + or + singes + perroquets + sabres

    /** Renvoie la valeur d'un dé par son identifiant HTML. */
    fun valeur(id: String): Int = when (id) {
        "skulls"   -> cranes
        "diamonds" -> diamants
        "gold"     -> or
        "monkeys"  -> singes
        "parrots"  -> perroquets
        "sabers"   -> sabres
        else       -> 0
    }

    /** Renvoie un nouvel objet avec la valeur du dé identifié mise à jour. */
    fun avecValeur(id: String, valeur: Int): LancerDes = when (id) {
        "skulls"   -> copy(cranes     = valeur)
        "diamonds" -> copy(diamants   = valeur)
        "gold"     -> copy(or         = valeur)
        "monkeys"  -> copy(singes     = valeur)
        "parrots"  -> copy(perroquets = valeur)
        "sabers"   -> copy(sabres     = valeur)
        else       -> this
    }
}
