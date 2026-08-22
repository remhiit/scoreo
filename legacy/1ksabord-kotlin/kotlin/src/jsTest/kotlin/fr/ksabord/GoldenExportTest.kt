package fr.ksabord

import fr.ksabord.ui.CLÉ_HISTORIQUE
import fr.ksabord.ui.ExportSabords
import fr.ksabord.ui.construireEnveloppeExport
import fr.ksabord.ui.obtenirHistoriqueParties
import kotlinx.browser.localStorage
import kotlinx.serialization.json.Json
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Le côté oracle du test différentiel : ce même corpus est rejoué par le port
 * TypeScript (`packages/module-mille-sabords`), qui doit produire exactement
 * cette sortie.
 *
 * L'intérêt n'est pas de vérifier le Kotlin — ses 91 tests de domaine s'en
 * chargent — mais de **figer** sa sortie. Si elle bouge, le port n'est plus
 * vérifié contre rien, et c'est ici qu'on l'apprend.
 */
class GoldenExportTest {

    /** Compact, pas `prettyPrint` : la comparaison porte sur la donnée, pas sur l'indentation. */
    private val jsonCompact = Json { explicitNulls = false }

    private fun lire(chemin: String): String = js("require('fs').readFileSync(chemin, 'utf8')") as String

    private fun ecrire(chemin: String, contenu: String) {
        js("require('fs').writeFileSync(chemin, contenu)")
    }

    /**
     * Node lance les tests depuis un répertoire de build dont la profondeur
     * dépend de la version du plugin Kotlin/JS. On remonte donc jusqu'au
     * monorepo plutôt que de compter les `..`, ce qu'un jour de mise à jour
     * casserait en silence.
     */
    private fun racineGolden(): String = js(
        """
        (function () {
            var path = require('path');
            var fs = require('fs');
            var dir = process.cwd();
            for (var i = 0; i < 12; i++) {
                var candidate = path.join(dir, 'packages/module-mille-sabords/tests/golden');
                if (fs.existsSync(candidate)) return candidate;
                var parent = path.dirname(dir);
                if (parent === dir) break;
                dir = parent;
            }
            throw new Error('golden corpus not found from ' + process.cwd());
        })()
    """,
    ) as String

    @BeforeTest
    fun setUp() {
        js(
            """
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
        """,
        )
        localStorage.setItem(CLÉ_HISTORIQUE, lire("${racineGolden()}/corpus.json"))
    }

    @Test
    fun enveloppeExport_correspondAuGolden() {
        val produit = jsonCompact.encodeToString(
            ExportSabords.serializer(),
            construireEnveloppeExport(obtenirHistoriqueParties(), EXPORTED_AT_FIGE),
        )
        // Écrit avant d'assener l'assertion : sur un écart, on veut le diff sous
        // la main plutôt qu'un message tronqué dans un rapport mocha.
        ecrire("${racineGolden()}/actual-export.json", produit)

        val attendu = lire("${racineGolden()}/expected-export.json").trim()
        assertEquals(attendu, produit)
    }
}
