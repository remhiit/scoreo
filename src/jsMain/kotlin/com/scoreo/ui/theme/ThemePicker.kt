package com.scoreo.ui.theme

import androidx.compose.runtime.Composable
import com.scoreo.ui.Strings
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Text

/**
 * Flavor + accent picker, opened from the burger menu. Reuses the
 * existing .modal-overlay/.modal-content pattern (see scoring.css) —
 * no need to wait for the LudoModal composable (P1) for a dialog this
 * simple.
 */
@Composable
fun ThemePickerDialog(themeState: ThemeState, onClose: () -> Unit) {
    Div(attrs = {
        classes("modal-overlay")
        onClick { onClose() }
    }) {}
    Div(attrs = { classes("modal-content") }) {
        Div(attrs = { classes("modal-title") }) { Text(Strings.TITLE_THEME_PICKER) }

        Div(attrs = { classes("theme-picker-label") }) { Text(Strings.LABEL_FLAVOR) }
        Div(attrs = { classes("theme-picker-row") }) {
            FLAVORS.forEach { flavor ->
                Button(attrs = {
                    classes("theme-chip")
                    if (flavor == themeState.flavor) classes("theme-chip--active")
                    onClick { themeState.setFlavor(flavor) }
                }) { Text(flavor.replaceFirstChar { it.uppercase() }) }
            }
        }

        Div(attrs = { classes("theme-picker-label") }) { Text(Strings.LABEL_ACCENT) }
        Div(attrs = { classes("theme-picker-row") }) {
            ACCENTS.forEach { accent ->
                Button(attrs = {
                    classes("accent-swatch")
                    if (accent == themeState.accent) classes("accent-swatch--active")
                    style { property("background", "var(--ctp-$accent)") }
                    attr("aria-label", accent)
                    onClick { themeState.setAccent(accent) }
                }) {}
            }
        }

        Div(attrs = { classes("modal-actions") }) {
            Button(attrs = {
                classes("btn", "btn-secondary")
                onClick { onClose() }
            }) { Text(Strings.BTN_CLOSE) }
        }
    }
}
