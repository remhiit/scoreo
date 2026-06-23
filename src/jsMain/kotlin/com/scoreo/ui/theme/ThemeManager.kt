package com.scoreo.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.browser.document
import kotlinx.browser.window

private const val STORAGE_KEY = "scoreo_theme"

private fun readSavedTheme(): Boolean? {
    val saved = window.localStorage.getItem(STORAGE_KEY)
    return when (saved) {
        "dark" -> true
        "light" -> false
        else -> null
    }
}

private fun systemPrefersDark(): Boolean =
    window.matchMedia("(prefers-color-scheme: dark)").matches

private fun applyTheme(isDark: Boolean) {
    val html = document.documentElement
    if (isDark) {
        html?.setAttribute("data-theme", "dark")
    } else {
        html?.removeAttribute("data-theme")
    }
}

data class ThemeState(
    val isDark: Boolean,
    val toggle: () -> Unit,
)

@Composable
fun rememberThemeState(): ThemeState {
    var isDark by remember {
        val initial = readSavedTheme() ?: systemPrefersDark()
        applyTheme(initial)
        mutableStateOf(initial)
    }

    val toggle = remember {
        {
            val next = !isDark
            isDark = next
            window.localStorage.setItem(STORAGE_KEY, if (next) "dark" else "light")
            applyTheme(next)
        }
    }

    return ThemeState(isDark, toggle)
}
