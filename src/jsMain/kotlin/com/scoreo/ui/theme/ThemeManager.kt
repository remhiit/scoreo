package com.scoreo.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.browser.document
import kotlinx.browser.window

private const val FLAVOR_KEY = "scoreo_flavor"
private const val ACCENT_KEY = "scoreo_accent"

/** Pre-Catppuccin binary toggle. Read once for migration, never written again. */
private const val LEGACY_THEME_KEY = "scoreo_theme"

private const val DEFAULT_ACCENT = "mauve"

/** The 4 Catppuccin flavors, light → dark. */
val FLAVORS = listOf("latte", "frappe", "macchiato", "mocha")

/** The 14 Catppuccin hues usable as `data-accent`, see tokens/semantic.css. */
val ACCENTS = listOf(
    "rosewater", "flamingo", "pink", "mauve", "red", "maroon", "peach",
    "yellow", "green", "teal", "sky", "sapphire", "blue", "lavender",
)

private fun systemPrefersDark(): Boolean =
    window.matchMedia("(prefers-color-scheme: dark)").matches

/**
 * Reads the saved flavor, migrating from the old binary dark/light
 * toggle (`scoreo_theme`) the first time a user without the new key
 * loads the app. `scoreo_theme` is left untouched (no cleanup needed —
 * `scoreo_flavor` takes precedence once written).
 */
private fun readInitialFlavor(): String {
    window.localStorage.getItem(FLAVOR_KEY)?.let { return it }
    when (window.localStorage.getItem(LEGACY_THEME_KEY)) {
        "dark" -> return "mocha"
        "light" -> return "latte"
    }
    return if (systemPrefersDark()) "mocha" else "latte"
}

private fun readInitialAccent(): String =
    window.localStorage.getItem(ACCENT_KEY) ?: DEFAULT_ACCENT

private fun applyTheme(flavor: String, accent: String) {
    val html = document.documentElement
    html?.setAttribute("data-theme", flavor)
    html?.setAttribute("data-accent", accent)
}

data class ThemeState(
    val flavor: String,
    val accent: String,
    val setFlavor: (String) -> Unit,
    val setAccent: (String) -> Unit,
)

@Composable
fun rememberThemeState(): ThemeState {
    val initialFlavor = remember { readInitialFlavor() }
    val initialAccent = remember { readInitialAccent() }
    var flavor by remember { mutableStateOf(initialFlavor) }
    var accent by remember { mutableStateOf(initialAccent) }

    // Applies once on first composition — covers first paint and the
    // legacy-key migration (scoreo_flavor/scoreo_accent get written even
    // if the user never opens the theme picker).
    remember {
        applyTheme(initialFlavor, initialAccent)
        window.localStorage.setItem(FLAVOR_KEY, initialFlavor)
        window.localStorage.setItem(ACCENT_KEY, initialAccent)
    }

    val setFlavor = remember {
        { next: String ->
            flavor = next
            window.localStorage.setItem(FLAVOR_KEY, next)
            applyTheme(next, accent)
        }
    }
    val setAccent = remember {
        { next: String ->
            accent = next
            window.localStorage.setItem(ACCENT_KEY, next)
            applyTheme(flavor, next)
        }
    }

    return ThemeState(flavor, accent, setFlavor, setAccent)
}
