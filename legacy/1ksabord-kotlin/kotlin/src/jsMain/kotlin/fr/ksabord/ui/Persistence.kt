package fr.ksabord.ui

import fr.ksabord.domaine.*
import kotlinx.browser.document
import kotlinx.browser.localStorage
import kotlinx.browser.window
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import org.w3c.dom.HTMLElement
import org.w3c.dom.asList
import kotlin.js.Date

// ==================== Clés localStorage ====================

internal const val CLÉ_PARTIE    = "partie"
internal const val CLÉ_JOUEURS   = "joueurs_connus"
internal const val CLÉ_HISTORIQUE = "historique_parties"

internal val formatJson       = Json { ignoreUnknownKeys = true }
internal val formatJsonPretty = Json { prettyPrint = true; ignoreUnknownKeys = true }

// ==================== Instantané de Partie ====================

@Serializable
private data class SnapshotPartie(
    val joueurs:            List<String>,
    val historique:         List<EvenementCoup>,
    val index:              Int,
    val dernierTour:        Boolean,
    val numeroDernierTour:  Int,
    val commencee:          Boolean,
    val magiquePirate:      Boolean = false,
)

// ==================== Sauvegarde / restauration de la partie ====================

/**
 * Sauvegarde l'état complet de la partie en cours.
 * Si aucun joueur n'est présent, efface toute sauvegarde existante.
 */
fun sauvegarderPartie() {
    if (partie.joueurs.isEmpty()) {
        localStorage.removeItem(CLÉ_PARTIE)
        return
    }
    val snapshot = SnapshotPartie(
        joueurs           = partie.joueurs.toList(),
        historique        = partie.historique.toList(),
        index             = partie.indexJoueurActuel,
        dernierTour       = partie.dernierTour,
        numeroDernierTour = partie.numeroDernierTour,
        commencee         = partie.commencee,
        magiquePirate     = partie.magiquePirate,
    )
    localStorage.setItem(CLÉ_PARTIE, formatJson.encodeToString(snapshot))
}

/**
 * Restaure la partie sauvegardée depuis le localStorage.
 * Renvoie true si une sauvegarde valide a été trouvée et chargée.
 */
fun restaurerPartie(): Boolean {
    val json = localStorage.getItem(CLÉ_PARTIE) ?: return false
    return try {
        val snapshot = formatJson.decodeFromString<SnapshotPartie>(json)
        partie.joueurs.addAll(snapshot.joueurs)
        partie.historique.addAll(snapshot.historique)
        partie.indexJoueurActuel = snapshot.index
        partie.dernierTour       = snapshot.dernierTour
        partie.numeroDernierTour = snapshot.numeroDernierTour
        partie.commencee         = snapshot.commencee
        partie.magiquePirate     = snapshot.magiquePirate
        true
    } catch (e: Exception) {
        localStorage.removeItem(CLÉ_PARTIE)
        false
    }
}

/** Supprime la sauvegarde de la partie en cours. */
fun effacerPartieSauvegardee() {
    localStorage.removeItem(CLÉ_PARTIE)
}

// ==================== Joueurs connus ====================

/**
 * Ajoute les joueurs de la partie en cours à la liste des joueurs connus
 * et sauvegarde cette liste triée alphabétiquement.
 */
fun mettreAJourJoueursConnus() {
    val connus = obtenirJoueursConnus().toMutableSet()
    connus.addAll(partie.joueurs)
    localStorage.setItem(CLÉ_JOUEURS, formatJson.encodeToString(connus.sorted()))
}

/** Renvoie la liste des joueurs connus, triée alphabétiquement. */
fun obtenirJoueursConnus(): List<String> {
    val json = localStorage.getItem(CLÉ_JOUEURS) ?: return emptyList()
    return try {
        formatJson.decodeFromString<List<String>>(json)
    } catch (e: Exception) {
        emptyList()
    }
}

/** Retire définitivement un joueur de la liste des joueurs connus. */
fun oublierJoueurConnu(nom: String) {
    val connus = obtenirJoueursConnus().filter { it != nom }
    if (connus.isEmpty()) localStorage.removeItem(CLÉ_JOUEURS)
    else localStorage.setItem(CLÉ_JOUEURS, formatJson.encodeToString(connus))
}

// ==================== Historique des parties terminées ====================

/** Génère un UUID via l'API crypto (navigateur ou Node.js). */
internal fun genererUuid(): String =
    js("crypto.randomUUID()").unsafeCast<String>()

/**
 * Archive la partie courante dans l'historique (sans limite de nombre).
 * Doit être appelé juste avant de réinitialiser la partie.
 */
fun archiverPartieTerminee() {
    val classement = partie.joueurs
        .mapIndexed { i, nom -> ResultatJoueur(nom, partie.totalJoueur(i), i) }
        .sortedByDescending { it.score }

    val entree = PartieTerminee(
        uuid          = genererUuid(),
        horodatage    = Date.now().toLong(),
        classement    = classement,
        nombreManches = partie.mancheActuelle(),
        magiquePirate = partie.magiquePirate,
        coups         = partie.historique.toList(),
    )

    val liste = obtenirHistoriqueParties().toMutableList()
    liste.add(0, entree)
    localStorage.setItem(CLÉ_HISTORIQUE, formatJson.encodeToString(liste))
}

/**
 * Renvoie la liste des parties terminées, de la plus récente à la plus ancienne.
 * Assure la rétrocompatibilité : si une entree n'a pas d'UUID, en génère un et persiste.
 */
fun obtenirHistoriqueParties(): List<PartieTerminee> {
    val json = localStorage.getItem(CLÉ_HISTORIQUE) ?: return emptyList()
    return try {
        val parties = formatJson.decodeFromString<List<PartieTerminee>>(json)
        var modifie = false
        val avecUuid = parties.map { p ->
            if (p.uuid.isEmpty()) {
                modifie = true
                p.copy(uuid = genererUuid())
            } else p
        }
        if (modifie) localStorage.setItem(CLÉ_HISTORIQUE, formatJson.encodeToString(avecUuid))
        avecUuid
    } catch (e: Exception) {
        emptyList()
    }
}

/** Supprime tout l'historique des parties. */
fun effacerHistoriqueParties() {
    localStorage.removeItem(CLÉ_HISTORIQUE)
}

// ==================== Classes pour export JSON externe ====================

@Serializable
data class ExportSabords(
    val version:      String,
    val game:         String,
    val exportedAt:   Long,
    val gameCount:    Int,
    val winCondition: String? = null,
    val games:        List<ExportPartie>,
)

@Serializable
data class ScoreExport(val name: String, val score: Int)

@Serializable
data class RoundExport(val scores: List<ScoreExport>)

@Serializable
data class ExportPartie(
    val id: String,
    val date: Long,
    val ranking: List<ExportClassement>,
    val details: List<RoundExport> = emptyList(),
)

@Serializable
data class ExportClassement(
    val name: String,
    val score: Int,
    val rank: Int,
)

// ==================== Export / Import ====================

/**
 * Sérialise l'historique complet en JSON, compresse avec LZW+btoa et déclenche
 * le téléchargement d'un fichier « .sabords ».
 */
fun exporterHistorique() {
    val historique = obtenirHistoriqueParties()
    if (historique.isEmpty()) {
        window.alert("Aucune partie à exporter.")
        return
    }
    val json      = formatJson.encodeToString(historique)
    val compresse = compresserLZW(json)

    // Passer les données via une propriété globale temporaire :
    // js() ne peut pas capturer de variables Kotlin, on bridge via window.
    window.asDynamic().__sabords_export = compresse
    try {
        js("""
            (function() {
                var data = window.__sabords_export;
                delete window.__sabords_export;
                var blob = new Blob([data], { type: 'text/plain' });
                var url  = URL.createObjectURL(blob);
                var a    = document.createElement('a');
                a.href     = url;
                a.download = '1000sabords.sabords';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(url); }, 100);
            })();
        """)
    } finally {
        js("delete window.__sabords_export")
    }
}

/**
 * Exporte l'historique en JSON clair (non compresse) destiné à un système
 * de scores multi-jeux. Produit un fichier .json avec une enveloppe descriptive.
 */
fun exporterHistoriqueJson() {
    val historique = obtenirHistoriqueParties()
    if (historique.isEmpty()) {
        window.alert("Aucune partie à exporter.")
        return
    }
    val jeux = historique.map { p ->
        val classement = p.classement.mapIndexed { i, j ->
            ExportClassement(name = j.nom, score = j.score, rank = i + 1)
        }
        val joueurs = p.classement.map { it.nom }
        val tailleManche = joueurs.size
        val details = if (p.coups.isEmpty()) emptyList()
        else p.coups.chunked(tailleManche).map { roundCoups ->
            val scores = joueurs.map { nom ->
                ScoreExport(name = nom, score = roundCoups.sumOf { coup -> coup.contributionPour(nom) })
            }
            RoundExport(scores = scores)
        }
        ExportPartie(
            id      = p.uuid,
            date    = p.horodatage,
            ranking = classement,
            details = details,
        )
    }
    val envelope = ExportSabords(
        version      = "1.1",
        game         = "1000 Sabords",
        exportedAt   = Date.now().toLong(),
        gameCount    = jeux.size,
        winCondition = "HIGHEST_SCORE",
        games        = jeux,
    )
    val json = formatJsonPretty.encodeToString(envelope)

    window.asDynamic().__sabords_export = json
    try {
        js("""
            (function() {
                var data = window.__sabords_export;
                delete window.__sabords_export;
                var blob = new Blob([data], { type: 'application/json' });
                var url  = URL.createObjectURL(blob);
                var a    = document.createElement('a');
                a.href     = url;
                a.download = '1000sabords-historique.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(url); }, 100);
            })();
        """)
    } finally {
        js("delete window.__sabords_export")
    }
}

/**
 * Traite le contenu d'un fichier importé (base64 LZW) :
 * décompresse, fusionne avec l'historique existant (déduplique par uuid),
 * et ajoute les joueurs inconnus aux joueurs connus.
 */
fun traiterImport(contenu: String) {
    try {
        val json       = decompresserLZW(contenu)
        val importees  = formatJson.decodeFromString<List<PartieTerminee>>(json)

        val existant    = obtenirHistoriqueParties()
        val uuidsExistants = existant.map { it.uuid }.filter { it.isNotEmpty() }.toSet()
        val nouvelles = importees.filter { p ->
            p.uuid.isNotEmpty() && p.uuid !in uuidsExistants
                    || p.uuid.isEmpty() && p.horodatage !in existant.map { it.horodatage }
        }

        if (nouvelles.isEmpty()) {
            window.alert("Toutes les parties sont déjà présentes (aucun doublon importé).")
            return
        }

        // Fusionner et trier par date décroissante
        val fusionne = (existant + nouvelles).sortedByDescending { it.horodatage }
        localStorage.setItem(CLÉ_HISTORIQUE, formatJson.encodeToString(fusionne))

        // Ajouter les joueurs inconnus
        val joueursConnus = obtenirJoueursConnus().toMutableSet()
        val avant         = joueursConnus.size
        for (p in nouvelles) p.classement.forEach { joueursConnus.add(it.nom) }
        val joueursAjoutes = joueursConnus.size - avant
        if (joueursAjoutes > 0) {
            localStorage.setItem(CLÉ_JOUEURS, formatJson.encodeToString(joueursConnus.sorted()))
        }

        // Fermer les modals et rafraîchir
        document.querySelectorAll(".modal-overlay").asList()
            .forEach { (it as? HTMLElement)?.remove() }
        render()

        val msg = buildString {
            append("${nouvelles.size} partie(s) importée(s).")
            if (joueursAjoutes > 0) append("\n$joueursAjoutes nouveau(x) joueur(s) ajouté(s).")
        }
        window.alert(msg)
    } catch (e: Exception) {
        window.alert("Fichier invalide ou corrompu.\n${e.message}")
    }
}
