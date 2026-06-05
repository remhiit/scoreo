package fr.ksabord.ui

import fr.ksabord.domaine.*
import kotlinx.browser.document
import kotlinx.browser.localStorage
import kotlinx.browser.window
import org.w3c.dom.HTMLElement
import org.w3c.dom.HTMLInputElement
import org.w3c.dom.HTMLSelectElement
import org.w3c.dom.asList

fun ajouterJoueur() {
    val input = document.getElementById("player-input") as? HTMLInputElement ?: return
    val nom = input.value.trim()
    if (nom.isEmpty() || partie.joueurs.size >= 8) return
    if (partie.joueurs.contains(nom)) {
        window.alert("Ce nom est déjà pris!")
        return
    }
    partie.joueurs.add(nom)
    sauvegarderPartie()
    render()
    (document.getElementById("player-input") as? HTMLInputElement)?.focus()
}

fun retirerJoueur(index: Int) {
    partie.joueurs.removeAt(index)
    sauvegarderPartie()
    render()
}

/** Ajoute directement un joueur connu sans passer par le champ de saisie. */
fun ajouterJoueurParNom(nom: String) {
    if (partie.joueurs.contains(nom) || partie.joueurs.size >= 8) return
    partie.joueurs.add(nom)
    sauvegarderPartie()
    render()
}

/** Retire un joueur de la liste des joueurs connus et rafraîchit. */
fun supprimerJoueurConnu(nom: String) {
    oublierJoueurConnu(nom)
    render()
}

fun démarrerPartie() {
    if (partie.joueurs.size < 2) return
    partie.commencer()
    mettreÀJourJoueursConnus()
    réinitialiserTour()
    sauvegarderPartie()
    render()
}

fun changerDé(type: String, delta: Int) {
    val actuel = dés.valeur(type)
    val nouvel = actuel + delta
    val total  = dés.total + delta
    if (nouvel < 0 || nouvel > 8 || total > 8 || total < 0) return
    dés = dés.avecValeur(type, nouvel)
    mettreÀJourCalcul()
}

fun mettreÀJourCalcul() {
    render()
    if (tabActif != "calc") changerOnglet(tabActif)
}

fun changerOnglet(onglet: String) {
    tabActif = onglet
    document.querySelectorAll(".tab-btn").asList().forEach    { it.asDynamic().classList.remove("active") }
    document.querySelectorAll(".tab-content").asList().forEach { it.asDynamic().classList.remove("active") }
    document.getElementById("tab-$onglet")?.classList?.add("active")
    document.getElementById("content-$onglet")?.classList?.add("active")
    if (onglet == "manual") {
        window.setTimeout({
            (document.getElementById("manual-score-input") as? HTMLInputElement)?.focus()
        }, 50)
    }
}

fun soumettreScoreCalcul() {
    val carte    = carteActuelle()
    val résultat = calculerScore(dés, carte)
    if (résultat.magiquePirate) {
        partie.terminerParMagiePirate()
    }
    enregistrerCoup(CoupCalculateur(
        joueur        = partie.joueurs[partie.indexJoueurActuel],
        carte         = carte,
        dés           = dés,
        score         = résultat.score,
        détails       = résultat.détails,
        bust          = résultat.bust,
        îleCrânes     = résultat.îleCrânes,
        pénalitéÎle   = résultat.pénalitéÎle,
        magiquePirate = résultat.magiquePirate,
    ))
}

fun soumettreScoreManuel() {
    val input = document.getElementById("manual-score-input") as? HTMLInputElement ?: return
    val score = input.value.toIntOrNull() ?: return
    val multiplicateur = multiplicateurManuel
    enregistrerCoup(CoupManuel(
        joueur         = partie.joueurs[partie.indexJoueurActuel],
        scoreEntré     = score,
        multiplicateur = multiplicateur,
        score          = score * multiplicateur,
    ))
    multiplicateurManuel = 1
}

fun scoreRapide(score: Int) {
    val input  = document.getElementById("manual-score-input") as? HTMLInputElement ?: return
    val actuel = input.value.toIntOrNull() ?: 0
    input.value = (actuel + score).toString()
}

fun basculerMultiplicateur() {
    multiplicateurManuel = if (multiplicateurManuel == 1) 2 else 1
    val badge = document.getElementById("manual-multiplier-badge") as? HTMLElement
    badge?.style?.display = if (multiplicateurManuel > 1) "inline-block" else "none"
}

fun effacerMultiplicateur() {
    multiplicateurManuel = 1
    val badge = document.getElementById("manual-multiplier-badge") as? HTMLElement
    badge?.style?.display = "none"
}

fun réinitialiserScoreManuel() {
    (document.getElementById("manual-score-input") as? HTMLInputElement)?.value = "0"
    effacerMultiplicateur()
}

fun îleRapide(crânes: Int) {
    val multiplicateur        = multiplicateurManuel
    val pénalitéParAdversaire = -(crânes * 100) * multiplicateur
    enregistrerCoup(CoupÎleCrânes(
        joueur                = partie.joueurs[partie.indexJoueurActuel],
        nombreCrânes          = crânes,
        pénalitéParAdversaire = pénalitéParAdversaire,
        multiplicateur        = multiplicateur,
    ))
    multiplicateurManuel = 1
}

fun enregistrerCoup(coup: ÉvénementCoup) {
    partie.ajouterCoup(coup)
    if (partie.estTerminée()) {
        archiverPartieTerminée()
        effacerPartieSauvegardée()
    } else {
        sauvegarderPartie()
    }
    réinitialiserTour()
    render()
}

fun annulerDernier() {
    if (partie.historique.isEmpty()) return
    partie.annulerDernier()
    sauvegarderPartie()
    réinitialiserTour()
    render()
}

fun confirmerNouvellePartie() {
    val overlay = document.createElement("div").apply {
        className = "modal-overlay"
        innerHTML = """
            <div class="modal">
                <h3>Nouvelle partie?</h3>
                <p>La partie en cours sera perdue.</p>
                <div class="modal-actions">
                    <button class="btn-secondary" data-action="dismiss-modal">Annuler</button>
                    <button class="btn-danger"    data-action="reset-game">Confirmer</button>
                </div>
            </div>
        """.trimIndent()
    }
    document.body?.appendChild(overlay)
    overlay.addEventListener("click", { e ->
        if (e.target == overlay) overlay.remove()
    })
}

fun réinitialiserPartie() {
    partie.réinitialiser()
    effacerPartieSauvegardée()
    tabActif = "calc"
    réinitialiserTour()
    document.querySelectorAll(".modal-overlay").asList()
        .forEach { (it as? HTMLElement)?.remove() }
    render()
}

fun basculerThème() {
    val html      = document.documentElement ?: return
    val estClair  = html.getAttribute("data-theme") == "light"
    val nouveauThème = if (estClair) "dark" else "light"
    html.setAttribute("data-theme", nouveauThème)
    localStorage.setItem("theme", nouveauThème)
    render()
}

fun lancerImport() {
    val input = document.createElement("input") as HTMLInputElement
    input.type = "file"
    input.accept = ".sabords"
    input.style.display = "none"
    document.body?.appendChild(input)
    input.addEventListener("change", { _ ->
        // Accès via dynamic pour éviter les problèmes de type FileList.get() en Kotlin/JS IR
        val fichier = input.asDynamic().files[0]
        if (fichier != null) {
            // js() retourne déjà un dynamic — pas besoin de .asDynamic()
            val reader: dynamic = js("new FileReader()")
            reader.onload = { e: dynamic ->
                val contenu = e.target.result.unsafeCast<String>()
                document.body?.removeChild(input)
                traiterImport(contenu)
            }
            reader.onerror = { _: dynamic ->
                document.body?.removeChild(input)
                window.alert("Erreur lors de la lecture du fichier.")
            }
            reader.readAsText(fichier)
        } else {
            document.body?.removeChild(input)
        }
    })
    input.click()
}

fun afficherModalExport() {
    val overlay = document.createElement("div").apply {
        className = "modal-overlay"
        innerHTML = renduModalExport()
    }
    document.body?.appendChild(overlay)
    overlay.addEventListener("click", { e ->
        if (e.target == overlay) overlay.remove()
    })
}

fun afficherStats() {
    val overlay = document.createElement("div").apply {
        className = "modal-overlay"
        innerHTML = renduModalStats()
    }
    document.body?.appendChild(overlay)
    overlay.addEventListener("click", { e ->
        if (e.target == overlay) overlay.remove()
    })
}

fun afficherHistorique() {
    val overlay = document.createElement("div").apply {
        className = "modal-overlay"
        innerHTML = renduModalHistorique()
    }
    document.body?.appendChild(overlay)
    overlay.addEventListener("click", { e ->
        if (e.target == overlay) overlay.remove()
    })
}

fun afficherDétailPartie(index: Int) {
    val p = obtenirHistoriqueParties().getOrNull(index) ?: return
    val overlay = document.createElement("div").apply {
        className = "modal-overlay"
        innerHTML = renduModalDétailPartie(p)
    }
    document.body?.appendChild(overlay)
    overlay.addEventListener("click", { e ->
        if (e.target == overlay) overlay.remove()
    })
}

fun viderHistorique() {
    effacerHistoriqueParties()
    document.querySelectorAll(".modal-overlay").asList()
        .forEach { (it as? HTMLElement)?.remove() }
    render()
}
