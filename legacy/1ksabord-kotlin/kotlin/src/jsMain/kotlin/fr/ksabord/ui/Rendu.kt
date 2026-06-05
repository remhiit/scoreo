package fr.ksabord.ui

import fr.ksabord.domaine.*
import kotlinx.browser.document
import kotlinx.browser.localStorage
import org.w3c.dom.HTMLElement
import org.w3c.dom.HTMLInputElement
import org.w3c.dom.HTMLSelectElement
import org.w3c.dom.asList
import kotlin.js.Date

// ==================== Utilitaires ====================

fun escHtml(str: String): String {
    val div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
}

fun icôneThème(): String =
    if (document.documentElement?.getAttribute("data-theme") == "light") "🌙" else "☀️"

// ==================== Rendu principal ====================

fun render() {
    val app = document.getElementById("app") as? HTMLElement ?: return
    val btnThème = """<button class="theme-toggle" data-action="toggle-theme" title="Changer de thème">${icôneThème()}</button>"""
    app.innerHTML = btnThème + if (!partie.commencée) renduÉcranConfig() else renduÉcranJeu()
    postRendu()
}

/**
 * Attache les listeners sur les éléments qui ne passent pas par la délégation de clics
 * (champs texte, select de carte).
 */
fun postRendu() {
    document.getElementById("player-input")?.addEventListener("keydown", {
        if (it.asDynamic().key == "Enter") ajouterJoueur()
    })
    document.getElementById("card-select")?.addEventListener("change", {
        val sel = document.getElementById("card-select") as? HTMLSelectElement
        carteSelectionnée = sel?.value ?: "none"
        mettreÀJourCalcul()
    })
    document.getElementById("manual-score-input")?.addEventListener("keydown", {
        if (it.asDynamic().key == "Enter") soumettreScoreManuel()
    })
}

// ==================== Écran de configuration ====================

fun renduÉcranConfig(): String {
    val élémentsJoueurs = partie.joueurs.mapIndexed { i, p ->
        """<li style="border-left-color: ${COULEURS_JOUEURS[i]}">
            <span class="player-name-display">${escHtml(p)}</span>
            <button class="remove-btn" data-action="remove-player" data-index="$i" title="Retirer">✕</button>
        </li>"""
    }.joinToString("\n")

    // Victoires par joueur connu (calculées depuis l'historique)
    val statsParNom = if (obtenirHistoriqueParties().isNotEmpty())
        calculerStatsJoueurs().associate { it.nom to it }
    else emptyMap()

    val joueursConnus = obtenirJoueursConnus().filter { it !in partie.joueurs }
    val chipsConnus = if (joueursConnus.isEmpty()) "" else buildString {
        append("""<div class="known-players">""")
        append("""<div class="known-players-label">⭐ Joueurs connus :</div>""")
        append("""<div class="known-players-chips">""")
        for (nom in joueursConnus) {
            val stats  = statsParNom[nom]
            val badge  = if (stats != null && stats.victoires > 0)
                """ <span class="chip-wins">🏆${stats.victoires}</span>""" else ""
            append("""<div class="known-player-chip">""")
            append("""<button class="btn-secondary btn-small" data-action="add-known-player" data-name="${escHtml(nom)}">${escHtml(nom)}$badge</button>""")
            append("""<button class="chip-forget" data-action="forget-known-player" data-name="${escHtml(nom)}" title="Oublier ce joueur">✕</button>""")
            append("""</div>""")
        }
        append("""</div></div>""")
    }

    val désactivéAjouter  = if (partie.joueurs.size >= 8) "disabled" else ""
    val désactivéDémarrer = if (partie.joueurs.size < 2)  "disabled" else ""

    val boutonHistorique = """<button class="btn-secondary historique-btn" data-action="show-history">📜 Historique des parties</button>"""
    val boutonStats = """<button class="btn-secondary historique-btn" data-action="show-stats">📊 Statistiques</button>"""
    val boutonImport = """<button class="btn-secondary historique-btn" data-action="import-history">📥 Importer</button>"""
    val boutonExport = """<button class="btn-secondary historique-btn" data-action="show-export-modal">📤 Exporter</button>"""

    return """
        <div class="screen active">
            <div class="setup-inner">
                <div class="setup-header">
                    <h1>🏴‍☠️ 1000 Sabords</h1>
                    <p class="subtitle">Compteur de points</p>
                </div>
                <div class="input-row">
                    <input type="text" id="player-input" placeholder="Nom du joueur" maxlength="15">
                    <button class="btn-primary" data-action="add-player" $désactivéAjouter>Ajouter</button>
                </div>
                <ul class="player-list">$élémentsJoueurs</ul>
                $chipsConnus
                <button class="btn-primary start-btn" data-action="start-game" $désactivéDémarrer>
                    ⚓ Commencer la partie (${partie.joueurs.size} joueurs)
                </button>
                $boutonHistorique
                $boutonStats
                $boutonImport
                $boutonExport
            </div>
        </div>
    """.trimIndent()
}

// ==================== Écran de jeu ====================

fun renduÉcranJeu(): String {
    val manche         = partie.mancheActuelle()
    val positionTour   = partie.historique.size % partie.joueurs.size

    if (partie.magiquePirate || (partie.dernierTour && manche > partie.numéroDernierTour && positionTour == 0)) {
        return renduÉcranFin()
    }

    val manches         = partie.manches()
    val totaux          = partie.joueurs.indices.map { partie.totalJoueur(it) }
    val totalMax        = totaux.maxOrNull() ?: 0
    val joueurActuel    = partie.joueurs[partie.indexJoueurActuel]
    val couleurActuelle = COULEURS_JOUEURS[partie.indexJoueurActuel]

    // En-têtes du tableau des scores
    val entêtesCellules = partie.joueurs.mapIndexed { i, p ->
        val cls = if (i == partie.indexJoueurActuel) "current-player" else ""
        """<th class="$cls" style="color: ${COULEURS_JOUEURS[i]}">${escHtml(p)}</th>"""
    }.joinToString("")

    // Lignes de scores
    val lignesTableau = buildString {
        manches.forEachIndexed { ri, toursManche ->
            val cellules = partie.joueurs.indices.joinToString("") { pi ->
                val coup = toursManche.getOrNull(pi)
                if (coup == null) "<td>—</td>"
                else renduCelluleCoup(coup)
            }
            append("""<tr><td class="round-label">Tour ${ri + 1}</td>$cellules</tr>""")
        }
        // Tour en cours (partiellement joué)
        if (positionTour > 0) {
            val cellules = partie.joueurs.indices.joinToString("") { pi ->
                val idxTour = manches.size * partie.joueurs.size + pi
                val coup    = partie.historique.getOrNull(idxTour)
                if (coup == null) "<td>—</td>"
                else renduCelluleCoup(coup)
            }
            append("""<tr><td class="round-label">Tour ${manches.size + 1}</td>$cellules</tr>""")
        }
    }

    val cellulesPied = totaux.mapIndexed { i, t ->
        val cls = when {
            t >= 6000                     -> "over-6000"
            t == totalMax && totalMax > 0 -> "leading"
            else                          -> ""
        }
        """<td class="$cls">$t</td>"""
    }.joinToString("")

    // Badge de tour
    val mancheAffichée  = (manche + if (positionTour > 0) 1 else 0).coerceAtLeast(1)
    val classeBadge     = if (partie.dernierTour) "round-badge final-round-badge" else "round-badge"
    val labelBadge      = if (partie.dernierTour) "⚠️ Dernier tour!" else "Tour $mancheAffichée"

    // Compteurs de dés
    val lignesDés = TYPES_DÉS.joinToString("") { td ->
        """<div class="dice-row">
            <span class="dice-icon">${td.icône}</span>
            <span class="dice-label">${td.label}</span>
            <div class="dice-controls">
                <button data-action="change-dice" data-type="${td.id}" data-delta="-1">−</button>
                <span class="count" id="dice-${td.id}">${dés.valeur(td.id)}</span>
                <button data-action="change-dice" data-type="${td.id}" data-delta="1">+</button>
            </div>
        </div>"""
    }

    val totalDés    = dés.total
    val classeTotal = if (totalDés == 8) "valid" else "warning"
    val icôneTotale = if (totalDés == 8) "✅" else "⚠️"

    // Info contextuelle sur la carte
    val infoCarteHtml = when (carteSelectionnée) {
        "diamond" -> "💎 +1 diamant ajouté par la carte · 🪄 8 diamants aux dés = <strong>Magie Pirate !</strong>"
        "gold"    -> "🪙 +1 pièce d'or ajoutée par la carte · 🪄 8 pièces d'or aux dés = <strong>Magie Pirate !</strong>"
        "skull1"  -> "💀 +1 crâne ajouté par la carte (ne comptez pas dans les dés)"
        "skull2"  -> "💀💀 +2 crânes ajoutés par la carte (ne comptez pas dans les dés)"
        "animals" -> "🐒🦜 Singes et perroquets comptent ensemble pour les séries"
        "captain" -> "👑 Le score final sera doublé"
        "sea2"    -> "⚔️ Vous devez obtenir au moins 2 sabres"
        "sea3"    -> "⚔️ Vous devez obtenir au moins 3 sabres"
        "sea4"    -> "⚔️ Vous devez obtenir au moins 4 sabres"
        else      -> ""
    }

    // Prévisualisation du score (calculateur)
    val aperçuScoreHtml = if (totalDés > 0) buildString {
        val résultat = calculerScore(dés, carteSelectionnée)
        val classeValeur = when {
            résultat.îleCrânes   -> "skull-island"
            résultat.score > 0   -> "positive"
            résultat.score < 0   -> "negative"
            else                 -> "zero"
        }
        append("""<div class="calc-result">
            <div class="score-value $classeValeur">
                ${if (résultat.îleCrânes) "☠️" else ""} ${résultat.score} pts
            </div>
            <div class="breakdown">${escHtml(résultat.détails).replace("\n", "<br>")}</div>
        </div>""")
        if (résultat.magiquePirate) {
            append("""<div class="magie-pirate-banner">🪄 MAGIE PIRATE — Victoire légendaire !</div>""")
        }
        if (résultat.îleCrânes) {
            append("""<div class="skull-island-info">
                <div class="skull-title">☠️ Île de la Tête de Mort</div>
                <div class="skull-desc">Chaque adversaire perdra ${-résultat.pénalitéÎle} pts</div>
            </div>""")
        }
    } else ""

    // Options du sélecteur de carte
    val optionsCarte = CARTES.joinToString("") { c ->
        """<option value="${c.id}" ${if (c.id == carteSelectionnée) "selected" else ""}>${c.label}</option>"""
    }

    val désactivéAnnuler = if (partie.historique.isEmpty()) "disabled" else ""
    val calcActif        = if (tabActif == "calc")   "active" else ""
    val manuelActif      = if (tabActif == "manual") "active" else ""

    return """
        <div class="screen active">
            <div class="game-header">
                <h2>🏴‍☠️ 1000 Sabords</h2>
                <span class="$classeBadge">$labelBadge</span>
            </div>

            <div class="game-layout">
                <div class="game-col-left">
                    <div class="scoreboard-wrap">
                        <table class="scoreboard">
                            <thead><tr><th></th>$entêtesCellules</tr></thead>
                            <tbody>$lignesTableau</tbody>
                            <tfoot><tr><td class="round-label"><strong>Total</strong></td>$cellulesPied</tr></tfoot>
                        </table>
                    </div>
                    <div class="game-actions">
                        <button class="btn-secondary" data-action="undo-last" $désactivéAnnuler title="Annuler le coup précédent">↩ Annuler le coup</button>
                        <button class="btn-danger"    data-action="show-confirm-new-game">🔄 Nouvelle partie</button>
                    </div>
                </div>

                <div class="game-col-right">
                    <div class="turn-panel">
                        <div class="current-turn-info">
                            <div class="turn-label">Au tour de</div>
                            <div class="player-name" style="color: $couleurActuelle">${escHtml(joueurActuel)}</div>
                        </div>

                        <div class="tabs">
                            <button class="tab-btn $calcActif"   id="tab-calc"   data-action="switch-tab" data-tab="calc">🎲 Calculateur</button>
                            <button class="tab-btn $manuelActif" id="tab-manual" data-action="switch-tab" data-tab="manual">✏️ Saisie rapide</button>
                        </div>

                        <div class="tab-content $calcActif" id="content-calc">
                            <div class="card-selector">
                                <label>Carte piochée :</label>
                                <select id="card-select">$optionsCarte</select>
                            </div>
                            <div class="dice-counters">$lignesDés</div>
                            <div class="dice-total $classeTotal">$icôneTotale $totalDés / 8 dés</div>
                            <button class="btn-primary calc-submit" data-action="submit-calc-score">
                                Valider le score
                            </button>
                            <div class="card-info" id="card-info">$infoCarteHtml</div>
                            $aperçuScoreHtml
                        </div>

                        <div class="tab-content $manuelActif" id="content-manual">
                            <div class="manual-entry">
                                <input type="number" id="manual-score-input" placeholder="Score" value="0">
                                <span id="manual-multiplier-badge"
                                      style="display:none;background:var(--primary);color:#000;padding:4px 8px;border-radius:var(--radius);font-weight:bold;font-size:0.85em;cursor:pointer;"
                                      data-action="clear-manual-multiplier">×2 🎩</span>
                                <button class="btn-secondary btn-small" data-action="reset-manual-score" title="Remettre à 0">🗑</button>
                                <button class="btn-primary" data-action="submit-manual-score">Valider</button>
                            </div>
                            <div class="quick-scores">
                                ${renduScoresRapides()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    """.trimIndent()
}

private fun groupeQR(titre: String, contenu: String) =
    """<div class="quick-scores-group">
        <div class="quick-scores-group-title">$titre</div>
        <div class="quick-scores-row">$contenu</div>
    </div>"""

private fun boutonQR(score: Int, label: String, titre: String) =
    """<button class="btn-secondary btn-small" data-action="quick-score" data-score="$score" title="$titre">$label</button>"""

private fun renduScoresRapides(): String = buildString {
    val boutDiamants = listOf(
        boutonQR(100,  "1💎", "+100 pts"), boutonQR(200,  "2💎", "+200 pts"),
        boutonQR(400,  "3💎", "+400 pts (300+100 bonus)"), boutonQR(600,  "4💎", "+600 pts (400+200 bonus)"),
        boutonQR(1000, "5💎", "+1000 pts (500+500 bonus)"), boutonQR(1600, "6💎", "+1600 pts (600+1000 bonus)"),
        boutonQR(2700, "7💎", "+2700 pts (700+2000 bonus)"), boutonQR(4800, "8💎", "+4800 pts (800+4000 bonus)"),
    ).joinToString("")

    val boutOr = listOf(
        boutonQR(100,  "1🪙", "+100 pts"), boutonQR(200,  "2🪙", "+200 pts"),
        boutonQR(400,  "3🪙", "+400 pts (300+100 bonus)"), boutonQR(600,  "4🪙", "+600 pts (400+200 bonus)"),
        boutonQR(1000, "5🪙", "+1000 pts (500+500 bonus)"), boutonQR(1600, "6🪙", "+1600 pts (600+1000 bonus)"),
        boutonQR(2700, "7🪙", "+2700 pts (700+2000 bonus)"), boutonQR(4800, "8🪙", "+4800 pts (800+4000 bonus)"),
    ).joinToString("")

    val boutSéries = listOf(
        boutonQR(100,  "3🎲", "+100 pts"), boutonQR(200, "4🎲", "+200 pts"),
        boutonQR(500,  "5🎲", "+500 pts"), boutonQR(1000, "6🎲", "+1000 pts"),
        boutonQR(2000, "7🎲", "+2000 pts"), boutonQR(4000, "8🎲", "+4000 pts"),
    ).joinToString("")

    val boutNaval = listOf(
        boutonQR(300,   "2⚔️ ✅", "+300 pts"),  boutonQR(-300,  "2⚔️ ❌", "-300 pts"),
        boutonQR(500,   "3⚔️ ✅", "+500 pts"),  boutonQR(-500,  "3⚔️ ❌", "-500 pts"),
        boutonQR(1000,  "4⚔️ ✅", "+1000 pts"), boutonQR(-1000, "4⚔️ ❌", "-1000 pts"),
    ).joinToString("")

    val boutÎle = (4..10).joinToString("") { n ->
        """<button class="btn-secondary btn-small" data-action="quick-skull-island" data-skulls="$n" title="-${n * 100} pts aux autres">${n}💀</button>"""
    }

    append(groupeQR("💎 Diamants",          boutDiamants))
    append(groupeQR("🪙 Pièces d'or",       boutOr))
    append(groupeQR("🎲 Séries identiques", boutSéries))
    append(groupeQR("🏆 Coffre plein",
        """<button class="btn-secondary btn-small" data-action="quick-score" data-score="500" title="+500 pts">Coffre</button>"""))
    append(groupeQR("⚔️ Combat Naval",      boutNaval))
    append(groupeQR("🎩 Capitaine",
        """<button class="btn-secondary btn-small" data-action="set-manual-multiplier" title="Double le score total">×2</button>"""))
    append(groupeQR("☠️ Île Tête de Mort",  boutÎle))
}

// ==================== Écran de fin ====================

fun renduÉcranFin(): String {
    val classement = partie.joueurs
        .mapIndexed { i, nom -> Triple(nom, partie.totalJoueur(i), i) }
        .sortedByDescending { it.second }

    val élémentsPodium = classement.mapIndexed { i, (nom, score, idx) ->
        """<li>
            <span class="rank">${EMOJIS_RANG[i]}</span>
            <span class="name" style="color: ${COULEURS_JOUEURS[idx]}">${escHtml(nom)}</span>
            <span class="score">$score pts</span>
        </li>"""
    }.joinToString("")

    val trophée = if (partie.magiquePirate) "🪄" else "🏆"
    val titre   = if (partie.magiquePirate)
        "${escHtml(classement[0].first)} remporte la partie avec la <strong>Magie Pirate</strong> !"
    else
        "${escHtml(classement[0].first)} remporte la partie !"

    return """
        <div class="screen active end-screen">
            <div class="trophy">$trophée</div>
            <h2>$titre</h2>
            <p class="winner-score">${classement[0].second} points</p>
            <ul class="final-ranking">$élémentsPodium</ul>
            <button class="btn-primary new-game-btn" data-action="new-game">
                🏴‍☠️ Nouvelle partie
            </button>
        </div>
    """.trimIndent()
}

// ==================== Modal historique ====================

private fun renduCelluleCoup(coup: ÉvénementCoup): String {
    val estÎle = coup is CoupÎleCrânes || (coup is CoupCalculateur && coup.îleCrânes)
    val score = when (coup) {
        is CoupCalculateur -> coup.score
        is CoupManuel      -> coup.score
        is CoupÎleCrânes   -> 0
    }
    val cls = when {
        estÎle     -> "skull-island-score"
        score == 0 -> "zero-score"
        score < 0  -> "negative-score"
        else       -> ""
    }
    val affichage = when {
        coup is CoupÎleCrânes                            -> "☠️ (${coup.pénalitéParAdversaire})"
        coup is CoupCalculateur && coup.îleCrânes        -> "☠️ (${coup.pénalitéÎle})"
        else                                             -> score.toString()
    }
    val titre = when (coup) {
        is CoupCalculateur -> escHtml(coup.détails)
        is CoupManuel      -> "Saisie: ${coup.scoreEntré}${if (coup.multiplicateur > 1) " ×${coup.multiplicateur}" else ""}"
        is CoupÎleCrânes   -> "☠️ ${coup.nombreCrânes} crânes → ${coup.pénalitéParAdversaire} pts/adversaire${if (coup.multiplicateur > 1) " ×${coup.multiplicateur}" else ""}"
    }
    return """<td class="$cls" title="$titre">$affichage</td>"""
}

fun renduModalHistorique(): String {
    val historique = obtenirHistoriqueParties()

    val contenu = if (historique.isEmpty()) {
        """<p class="historique-vide">Aucune partie terminée pour l'instant.</p>"""
    } else {
        historique.mapIndexed { idx, p ->
            val date       = Date(p.horodatage.toDouble())
            val dateStr    = date.toLocaleDateString() + " " + date.toLocaleTimeString()
            val badgeMagie = if (p.magiquePirate) """<span class="badge-magie">🪄 Magie Pirate</span>""" else ""
            val joueurs    = p.classement.mapIndexed { i, j ->
                """<div class="hist-joueur" style="color:${COULEURS_JOUEURS[j.indexCouleur]}">
                    ${EMOJIS_RANG[i]} ${escHtml(j.nom)} · ${j.score} pts
                </div>"""
            }.joinToString("")
            """<div class="historique-carte historique-carte-cliquable" data-action="show-game-detail" data-index="$idx">
                <div class="historique-meta">$dateStr · ${p.nombreManches} manches $badgeMagie</div>
                <div class="historique-joueurs">$joueurs</div>
                <div class="historique-hint">Cliquer pour voir le détail →</div>
            </div>"""
        }.joinToString("")
    }

    val btnEffacer = if (historique.isEmpty()) "" else
        """<button class="btn-danger btn-small" data-action="clear-history">🗑 Effacer</button>"""

    return """
        <div class="modal modal-large">
            <div class="modal-header-row">
                <h3>📜 Historique des parties</h3>
                <button class="remove-btn" data-action="dismiss-modal" title="Fermer">✕</button>
            </div>
            <div class="historique-liste">$contenu</div>
            <div class="modal-actions">
                $btnEffacer
                <button class="btn-secondary" data-action="dismiss-modal">Fermer</button>
            </div>
        </div>
    """.trimIndent()
}

// ==================== Modal export ====================

fun renduModalExport(): String {
    val historique = obtenirHistoriqueParties()
    val contenu = if (historique.isEmpty()) {
        """<p style="text-align:center;padding:16px 0;color:var(--text-dim)">
            Aucune partie dans l'historique.<br>
            Jouez une partie pour pouvoir exporter.
        </p>"""
    } else {
        """<p style="text-align:center;padding:12px 0">Choisissez le format d'export :</p>
        <div class="modal-actions" style="justify-content:center">
            <button class="btn-secondary" data-action="export-history">📤 1kSaBord</button>
            <button class="btn-secondary" data-action="export-history-json">📄 JSON</button>
            <button class="btn-secondary" data-action="dismiss-modal">Annuler</button>
        </div>"""
    }
    return """
        <div class="modal">
            <div class="modal-header-row">
                <h3>📤 Exporter l'historique</h3>
                <button class="remove-btn" data-action="dismiss-modal" title="Fermer">✕</button>
            </div>
            $contenu
        </div>
    """.trimIndent()
}

// ==================== Modal détail d'une partie ====================

fun renduModalDétailPartie(p: PartieTerminée): String {
    val date       = Date(p.horodatage.toDouble())
    val dateStr    = date.toLocaleDateString() + " " + date.toLocaleTimeString()
    val badgeMagie = if (p.magiquePirate) """<span class="badge-magie">🪄 Magie Pirate</span>""" else ""

    if (p.coups.isEmpty()) {
        return """
            <div class="modal modal-large">
                <div class="modal-header-row">
                    <h3>📋 Détail de la partie</h3>
                    <button class="remove-btn" data-action="dismiss-modal" title="Fermer">✕</button>
                </div>
                <p style="color:var(--text-dim);text-align:center;padding:20px">
                    Détail non disponible (partie archivée avant la mise à jour).
                </p>
                <div class="modal-actions">
                    <button class="btn-secondary" data-action="dismiss-modal">Fermer</button>
                </div>
            </div>
        """.trimIndent()
    }

    // Joueurs dans l'ordre original de jeu (indexCouleur = position dans la liste)
    val joueursOrdre = p.classement.sortedBy { it.indexCouleur }
    val n            = joueursOrdre.size

    val entêtes = joueursOrdre.joinToString("") { j ->
        """<th style="color:${COULEURS_JOUEURS[j.indexCouleur]}">${escHtml(j.nom)}</th>"""
    }

    // Grouper les coups par manche (n coups par manche)
    val manches = p.coups.chunked(n)

    val lignes = buildString {
        manches.forEachIndexed { i, coupsManche ->
            val cellules = joueursOrdre.indices.joinToString("") { ji ->
                val coup = coupsManche.getOrNull(ji)
                if (coup == null) "<td>—</td>" else renduCelluleCoup(coup)
            }
            append("""<tr><td class="round-label">Tour ${i + 1}</td>$cellules</tr>""")
        }
    }

    // Totaux finaux reconstruits depuis l'event log
    val totaux = joueursOrdre.joinToString("") { j ->
        val total = p.coups.fold(0) { acc, ev -> maxOf(0, acc + ev.contributionPour(j.nom)) }
        val cls   = if (j.score == p.classement.first().score) "leading" else ""
        """<td class="$cls"><strong>$total</strong></td>"""
    }

    return """
        <div class="modal modal-large">
            <div class="modal-header-row">
                <h3>📋 Détail de la partie</h3>
                <button class="remove-btn" data-action="dismiss-modal" title="Fermer">✕</button>
            </div>
            <div class="historique-meta" style="margin-bottom:12px">$dateStr · ${p.nombreManches} manches $badgeMagie</div>
            <div class="scoreboard-wrap">
                <table class="scoreboard">
                    <thead><tr><th></th>$entêtes</tr></thead>
                    <tbody>$lignes</tbody>
                    <tfoot><tr><td class="round-label"><strong>Total</strong></td>$totaux</tr></tfoot>
                </table>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" data-action="dismiss-modal">Fermer</button>
            </div>
        </div>
    """.trimIndent()
}

// ==================== Modal statistiques ====================

fun renduModalStats(): String {
    val stats  = calculerStatsJoueurs()
    val paires = calculerToutesPaires()

    if (stats.isEmpty()) {
        return """
            <div class="modal modal-large">
                <div class="modal-header-row">
                    <h3>📊 Statistiques</h3>
                    <button class="remove-btn" data-action="dismiss-modal" title="Fermer">✕</button>
                </div>
                <p style="color:var(--text-dim);text-align:center;padding:20px">Aucune partie terminée.</p>
                <div class="modal-actions">
                    <button class="btn-secondary" data-action="dismiss-modal">Fermer</button>
                </div>
            </div>
        """.trimIndent()
    }

    val lignesRanking = stats.mapIndexed { i, s ->
        val rang = if (i < EMOJIS_RANG.size) EMOJIS_RANG[i] else "${i + 1}."
        """<tr>
            <td class="round-label">$rang</td>
            <td style="text-align:left"><strong>${escHtml(s.nom)}</strong></td>
            <td class="${if (i == 0) "leading" else ""}">${s.victoires}</td>
            <td style="color:var(--text-dim)">${s.partiesJouées}</td>
            <td style="color:var(--text-dim)">${s.tauxVictoire}%</td>
        </tr>"""
    }.joinToString("")

    val sectionFaF = if (paires.isEmpty()) "" else buildString {
        append("""<h4 class="stats-section-titre">⚔️ Face à face</h4>""")
        append("""<div class="scoreboard-wrap"><table class="scoreboard"><thead>""")
        append("""<tr><th>Joueurs</th><th>Score</th><th>Parties</th></tr>""")
        append("""</thead><tbody>""")
        for (faf in paires) {
            val label = "${faf.victoiresJoueur1}–${faf.victoiresJoueur2}"
            append("""<tr>
                <td>${escHtml(faf.joueur1)} vs ${escHtml(faf.joueur2)}</td>
                <td><strong>$label</strong></td>
                <td style="color:var(--text-dim)">${faf.partiesEnsemble}</td>
            </tr>""")
        }
        append("""</tbody></table></div>""")
    }

    return """
        <div class="modal modal-large">
            <div class="modal-header-row">
                <h3>📊 Statistiques</h3>
                <button class="remove-btn" data-action="dismiss-modal" title="Fermer">✕</button>
            </div>
            <div class="stats-scroll">
                <div class="scoreboard-wrap">
                    <table class="scoreboard">
                        <thead><tr>
                            <th></th>
                            <th style="text-align:left">Joueur</th>
                            <th title="Victoires">🏆</th>
                            <th title="Parties jouées">🎲</th>
                            <th title="Taux de victoire">📈</th>
                        </tr></thead>
                        <tbody>$lignesRanking</tbody>
                    </table>
                </div>
                $sectionFaF
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" data-action="dismiss-modal">Fermer</button>
            </div>
        </div>
    """.trimIndent()
}
