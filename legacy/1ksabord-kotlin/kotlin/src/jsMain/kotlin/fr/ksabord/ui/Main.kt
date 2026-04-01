package fr.ksabord.ui

import kotlinx.browser.document
import kotlinx.browser.localStorage
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.EventListener

fun main() {
    // Restaurer le thème sauvegardé
    val thèmeSauvegardé = localStorage.getItem("theme")
    if (thèmeSauvegardé != null) {
        document.documentElement?.setAttribute("data-theme", thèmeSauvegardé)
    }

    // Délégation d'événements : tous les boutons/liens utilisent data-action
    document.addEventListener("click", EventListener { event ->
        val cible          = event.target as? HTMLElement ?: return@EventListener
        val élémentAction  = cible.closest("[data-action]") as? HTMLElement ?: return@EventListener
        val action         = élémentAction.getAttribute("data-action") ?: return@EventListener
        gérerAction(action, élémentAction)
    })

    // Restaurer la partie sauvegardée (silencieux si rien n'est trouvé)
    restaurerPartie()

    render()
}

fun gérerAction(action: String, élément: HTMLElement) {
    when (action) {
        "add-player"              -> ajouterJoueur()
        "remove-player"           -> retirerJoueur(élément.getAttribute("data-index")!!.toInt())
        "start-game"              -> démarrerPartie()
        "change-dice"             -> changerDé(
                                         élément.getAttribute("data-type")!!,
                                         élément.getAttribute("data-delta")!!.toInt(),
                                     )
        "switch-tab"              -> changerOnglet(élément.getAttribute("data-tab")!!)
        "submit-calc-score"       -> soumettreScoreCalcul()
        "submit-manual-score"     -> soumettreScoreManuel()
        "reset-manual-score"      -> réinitialiserScoreManuel()
        "quick-score"             -> scoreRapide(élément.getAttribute("data-score")!!.toInt())
        "set-manual-multiplier"   -> basculerMultiplicateur()
        "clear-manual-multiplier" -> effacerMultiplicateur()
        "quick-skull-island"      -> îleRapide(élément.getAttribute("data-skulls")!!.toInt())
        "undo-last"               -> annulerDernier()
        "show-confirm-new-game"   -> confirmerNouvellePartie()
        "reset-game"              -> réinitialiserPartie()
        "toggle-theme"            -> basculerThème()
        "dismiss-modal"           -> (élément.closest(".modal-overlay") as? HTMLElement)?.remove()
        "new-game"                -> réinitialiserPartie()
        "add-known-player"        -> ajouterJoueurParNom(élément.getAttribute("data-name")!!)
        "forget-known-player"     -> supprimerJoueurConnu(élément.getAttribute("data-name")!!)
        "show-history"            -> afficherHistorique()
        "show-stats"              -> afficherStats()
        "export-history"          -> exporterHistorique()
        "import-history"          -> lancerImport()
        "show-game-detail"        -> afficherDétailPartie(élément.getAttribute("data-index")!!.toInt())
        "clear-history"           -> viderHistorique()
    }
}
