package fr.ksabord.ui

import fr.ksabord.domaine.LancerDes
import kotlinx.browser.document
import org.w3c.dom.HTMLSelectElement

// ==================== État du tour courant (IHM JS) ====================

var des = LancerDes()
var tabActif = "calc"
var multiplicateurManuel = 1
var carteSelectionnee = "none"

/** Lit le select DOM, avec repli sur la valeur mémorisée entre les rendus. */
fun carteActuelle(): String {
    val sel = document.getElementById("card-select") as? HTMLSelectElement
    return sel?.value ?: carteSelectionnee
}

/** Réinitialise les des et l'état UI du tour. */
fun reinitialiserTour() {
    des = LancerDes()
    multiplicateurManuel = 1
    carteSelectionnee = "none"
}
