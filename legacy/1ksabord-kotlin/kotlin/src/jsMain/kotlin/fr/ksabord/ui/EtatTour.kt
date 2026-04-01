package fr.ksabord.ui

import fr.ksabord.domaine.LancerDés
import kotlinx.browser.document
import org.w3c.dom.HTMLSelectElement

// ==================== État du tour courant (IHM JS) ====================

var dés = LancerDés()
var tabActif = "calc"
var multiplicateurManuel = 1
var carteSelectionnée = "none"

/** Lit le select DOM, avec repli sur la valeur mémorisée entre les rendus. */
fun carteActuelle(): String {
    val sel = document.getElementById("card-select") as? HTMLSelectElement
    return sel?.value ?: carteSelectionnée
}

/** Réinitialise les dés et l'état UI du tour. */
fun réinitialiserTour() {
    dés = LancerDés()
    multiplicateurManuel = 1
    carteSelectionnée = "none"
}
