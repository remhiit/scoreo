package fr.ksabord.ui

import kotlinx.browser.window

// Fonctions globales JS disponibles dans tout environnement navigateur
private external fun encodeURIComponent(string: String): String
private external fun decodeURIComponent(string: String): String

private const val TAILLE_MAX_DICT = 65536

/**
 * Compresse une chaîne Unicode avec l'algorithme LZW et encode le résultat en base64.
 *
 * Pipeline : entrée → encodeURIComponent (→ ASCII pur) → LZW → binary string → btoa → base64
 * Le passage par encodeURIComponent garantit que tous les caractères sont en 0-127
 * avant compression, ce qui rend btoa sûr quel que soit le contenu Unicode initial.
 */
fun compresserLZW(entrée: String): String {
    val prétraité = encodeURIComponent(entrée)

    val dict = HashMap<String, Int>(512)
    for (i in 0..127) dict[i.toChar().toString()] = i
    var tailleDict = 128
    var courant = ""
    val binaire = StringBuilder(prétraité.length)

    fun écrireCode(code: Int) {
        binaire.append((code ushr 8).toChar())
        binaire.append((code and 0xFF).toChar())
    }

    for (c in prétraité) {
        val suite = courant + c
        if (dict.containsKey(suite)) {
            courant = suite
        } else {
            écrireCode(dict[courant] ?: c.code)
            dict[suite] = tailleDict++
            courant = c.toString()
            if (tailleDict >= TAILLE_MAX_DICT) {
                tailleDict = 128
                dict.clear()
                for (i in 0..127) dict[i.toChar().toString()] = i
            }
        }
    }
    if (courant.isNotEmpty()) écrireCode(dict[courant]!!)

    return window.btoa(binaire.toString())
}

/**
 * Décompresse une chaîne base64 produite par [compresserLZW].
 * Lance une exception si les données sont corrompues.
 */
fun décompresserLZW(compressé: String): String {
    val binaire = window.atob(compressé.trim())
    if (binaire.length < 2) return ""

    val codes = ArrayList<Int>(binaire.length / 2)
    var i = 0
    while (i + 1 < binaire.length) {
        codes.add((binaire[i].code shl 8) or binaire[i + 1].code)
        i += 2
    }

    val dict = HashMap<Int, String>(512)
    for (j in 0..127) dict[j] = j.toChar().toString()
    var tailleDict = 128

    var courant = dict[codes[0]] ?: error("Code initial invalide")
    val résultat = StringBuilder(courant)

    for (idx in 1 until codes.size) {
        val code = codes[idx]
        val entrée = when {
            dict.containsKey(code) -> dict[code]!!
            code == tailleDict     -> courant + courant[0]
            else                   -> error("Code LZW invalide : $code")
        }
        résultat.append(entrée)
        dict[tailleDict++] = courant + entrée[0]
        if (tailleDict >= TAILLE_MAX_DICT) {
            tailleDict = 128
            dict.clear()
            for (j in 0..127) dict[j] = j.toChar().toString()
        }
        courant = entrée
    }

    return decodeURIComponent(résultat.toString())
}
