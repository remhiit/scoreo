package fr.ksabord.ui

import kotlinx.browser.document
import kotlinx.browser.localStorage
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.EventListener

fun main() {
    // Restaurer le thème sauvegardé
    val themeSauvegarde = localStorage.getItem("theme")
    if (themeSauvegarde != null) {
        document.documentElement?.setAttribute("data-theme", themeSauvegarde)
    }

    // Délégation d'événements : tous les boutons/liens utilisent data-action
    document.addEventListener("click", EventListener { event ->
        val cible          = event.target as? HTMLElement ?: return@EventListener
        val elementAction  = cible.closest("[data-action]") as? HTMLElement ?: return@EventListener
        val action         = elementAction.getAttribute("data-action") ?: return@EventListener
        gererAction(action, elementAction)
    })

    // Restaurer la partie sauvegardée (silencieux si rien n'est trouvé)
    restaurerPartie()

    render()
}

fun gererAction(action: String, element: HTMLElement) {
    when (action) {
        "add-player"              -> ajouterJoueur()
        "remove-player"           -> retirerJoueur(element.getAttribute("data-index")!!.toInt())
        "start-game"              -> demarrerPartie()
        "change-dice"             -> changerDe(
                                         element.getAttribute("data-type")!!,
                                         element.getAttribute("data-delta")!!.toInt(),
                                     )
        "switch-tab"              -> changerOnglet(element.getAttribute("data-tab")!!)
        "submit-calc-score"       -> soumettreScoreCalcul()
        "submit-manual-score"     -> soumettreScoreManuel()
        "reset-manual-score"      -> reinitialiserScoreManuel()
        "quick-score"             -> scoreRapide(element.getAttribute("data-score")!!.toInt())
        "set-manual-multiplier"   -> basculerMultiplicateur()
        "clear-manual-multiplier" -> effacerMultiplicateur()
        "quick-skull-island"      -> ileRapide(element.getAttribute("data-skulls")!!.toInt())
        "undo-last"               -> annulerDernier()
        "show-confirm-new-game"   -> confirmerNouvellePartie()
        "reset-game"              -> reinitialiserPartie()
        "toggle-theme"            -> basculerTheme()
        "dismiss-modal"           -> (element.closest(".modal-overlay") as? HTMLElement)?.remove()
        "new-game"                -> reinitialiserPartie()
        "add-known-player"        -> ajouterJoueurParNom(element.getAttribute("data-name")!!)
        "forget-known-player"     -> supprimerJoueurConnu(element.getAttribute("data-name")!!)
        "show-history"            -> afficherHistorique()
        "show-stats"              -> afficherStats()
        "show-export-modal"       -> afficherModalExport()
        "export-history"          -> exporterHistorique()
        "export-history-json"     -> exporterHistoriqueJson()
        "import-history"          -> lancerImport()
        "show-game-detail"        -> afficherDetailPartie(element.getAttribute("data-index")!!.toInt())
        "clear-history"           -> viderHistorique()
    }
}
