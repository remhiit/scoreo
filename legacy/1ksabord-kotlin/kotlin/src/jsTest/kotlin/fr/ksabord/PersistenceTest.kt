package fr.ksabord

import fr.ksabord.domaine.*
import fr.ksabord.ui.*
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString
import kotlin.test.*

class PersistenceTest {

    @BeforeTest
    fun setUp() {
        // Polyfill localStorage et crypto pour Node.js
        js("""
            if (typeof globalThis.window === 'undefined') {
                var __store = {};
                globalThis.window = globalThis;
                globalThis.window.localStorage = {
                    getItem: function(k) { return __store[k] || null; },
                    setItem: function(k, v) { __store[k] = v; },
                    removeItem: function(k) { delete __store[k]; },
                    clear: function() { __store = {}; }
                };
            }
            if (typeof globalThis.crypto === 'undefined') {
                globalThis.crypto = {
                    randomUUID: function() {
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    }
                };
            }
        """)
        partie.réinitialiser()
        localStorage.removeItem(CLÉ_HISTORIQUE)
        localStorage.removeItem(CLÉ_JOUEURS)
    }

    // ===== helpers =====

    private fun créerPartieTerminée(
        horodatage: Long = 1000L,
        uuid: String = genererUuid(),
        joueurs: List<Pair<String, Int>> = listOf("Alice" to 1200, "Bob" to 800),
    ): PartieTerminée {
        val classement = joueurs.mapIndexed { i, (nom, score) ->
            RésultatJoueur(nom, score, i)
        }.sortedByDescending { it.score }
        return PartieTerminée(
            uuid = uuid,
            horodatage = horodatage,
            classement = classement,
            nombreManches = 3,
            coups = emptyList(),
        )
    }

    private fun stockerPartie(p: PartieTerminée) {
        localStorage.setItem(CLÉ_HISTORIQUE, formatJson.encodeToString(listOf(p)))
    }

    // ===== genererUuid =====

    @Test fun genererUuid_retourneUneChaîneNonVide() {
        assertTrue(genererUuid().isNotEmpty())
    }

    @Test fun genererUuid_ressembleÀUnUUIDv4() {
        val uuid = genererUuid()
        val pattern = """^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$""".toRegex()
        assertTrue(pattern.matches(uuid.lowercase()), "Format UUIDv4 attendu, obtenu: $uuid")
    }

    @Test fun genererUuid_retourneDesValeursUniques() {
        val uuids = (1..10).map { genererUuid() }
        assertEquals(10, uuids.distinct().size)
    }

    // ===== archiverPartieTerminée → uuid présent =====

    @Test fun archiverPartieTerminée_génèreUnUUID() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        partie.commencer()
        partie.ajouterCoup(CoupManuel("Alice", 500, 1, 500))
        partie.ajouterCoup(CoupManuel("Bob", 300, 1, 300))
        archiverPartieTerminée()

        val historique = obtenirHistoriqueParties()
        assertEquals(1, historique.size)
        assertTrue(historique[0].uuid.isNotEmpty())
    }

    @Test fun archiverPartieTerminée_uuidUniqueÀChaqueFois() {
        partie.joueurs.add("Alice"); partie.joueurs.add("Bob")
        repeat(3) {
            partie.commencer()
            partie.ajouterCoup(CoupManuel("Alice", 100, 1, 100))
            partie.ajouterCoup(CoupManuel("Bob", 100, 1, 100))
            archiverPartieTerminée()
            partie.réinitialiser()
        }
        val historique = obtenirHistoriqueParties()
        assertEquals(3, historique.size)
        assertEquals(3, historique.map { it.uuid }.distinct().size)
    }

    // ===== backfill : obtenirHistoriqueParties avec legacy =====

    @Test fun obtenirHistoriqueParties_backfillGénèreUUIDPourLegacy() {
        val legacy = """[{"horodatage":100,"classement":[{"nom":"Alice","score":500,"indexCouleur":0}],"nombreManches":2,"coups":[]}]"""
        localStorage.setItem(CLÉ_HISTORIQUE, legacy)

        val historique = obtenirHistoriqueParties()
        assertEquals(1, historique.size)
        assertTrue(historique[0].uuid.isNotEmpty())
    }

    @Test fun obtenirHistoriqueParties_backfillPersisteLesUUID() {
        val legacy = """[{"horodatage":100,"classement":[{"nom":"Alice","score":500,"indexCouleur":0}],"nombreManches":2,"coups":[]}]"""
        localStorage.setItem(CLÉ_HISTORIQUE, legacy)
        obtenirHistoriqueParties()

        val rechargé = localStorage.getItem(CLÉ_HISTORIQUE)
        assertNotNull(rechargé)
        assertTrue(rechargé!!.contains("uuid"))
    }

    @Test fun obtenirHistoriqueParties_neModifiePasLesEntréesAvecUUID() {
        val uuid = genererUuid()
        stockerPartie(créerPartieTerminée(uuid = uuid))

        val historique = obtenirHistoriqueParties()
        assertEquals(uuid, historique[0].uuid)
    }

    // ===== export JSON =====

    @Test fun exportPartie_idCorrespondÀUUID() {
        val uuid = genererUuid()
        stockerPartie(créerPartieTerminée(uuid = uuid))

        val exportData = construireExportJson()
        assertEquals("1000 Sabords", exportData.game)
        assertEquals(uuid, exportData.games[0].id)
    }

    @Test fun exportPartie_classementRangéCorrespondÀIndex() {
        stockerPartie(créerPartieTerminée(joueurs = listOf("Bob" to 800, "Alice" to 1200)))

        val ranking = construireExportJson().games[0].ranking
        assertEquals("Alice", ranking[0].name)
        assertEquals(1, ranking[0].rank)
        assertEquals("Bob", ranking[1].name)
        assertEquals(2, ranking[1].rank)
    }

    @Test fun exportPartie_detailsContientCoups() {
        val coups = listOf(CoupManuel("Alice", 500, 1, 500))
        stockerPartie(créerPartieTerminée().copy(coups = coups))

        val details = construireExportJson().games[0].details
        assertEquals(500, (details[0] as CoupManuel).score)
    }

    @Test fun exportContientPlusieursParties() {
        val p1 = créerPartieTerminée(horodatage = 100L)
        val p2 = créerPartieTerminée(horodatage = 200L)
        localStorage.setItem(CLÉ_HISTORIQUE, formatJson.encodeToString(listOf(p1, p2)))

        val exportData = construireExportJson()
        assertEquals(2, exportData.gameCount)
        assertEquals(2, exportData.games.size)
    }

    @Test fun exportFormatJsonValide() {
        stockerPartie(créerPartieTerminée())

        val json = formatJsonPretty.encodeToString(construireExportJson())
        assertTrue(json.isNotEmpty())
        assertTrue(json.contains("1000 Sabords"))
        assertTrue(json.contains("\"id\""))
    }
}

/**
 * Construit l'enveloppe d'export sans déclencher le téléchargement.
 */
internal fun construireExportJson(): ExportSabords {
    val historique = obtenirHistoriqueParties()
    val jeux = historique.map { p ->
        val classement = p.classement.mapIndexed { i, j ->
            ExportClassement(name = j.nom, score = j.score, rank = i + 1)
        }
        ExportPartie(
            id        = p.uuid,
            timestamp = p.horodatage,
            rounds    = p.nombreManches,
            ranking   = classement,
            details   = p.coups,
        )
    }
    return ExportSabords(
        game       = "1000 Sabords",
        exportedAt = kotlin.js.Date.now().toLong(),
        gameCount  = jeux.size,
        games      = jeux,
    )
}
