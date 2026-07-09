package com.scoreo.ui.theme

import androidx.compose.runtime.Composable
import com.scoreo.ui.Strings
import com.scoreo.ui.shared.ButtonVariant
import com.scoreo.ui.shared.LudoButton
import com.scoreo.ui.shared.LudoModal
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Text

/**
 * Flavor + accent picker, opened from the burger menu. Chips/swatches
 * stay custom (Ludo has no "color swatch" primitive), but the dialog
 * itself and its Close button now use LudoModal/LudoButton — this
 * predated those composables (P0-03), so it was the last consumer of
 * the legacy .modal-overlay/.modal-content/.btn-secondary pattern.
 */
@Composable
fun ThemePickerDialog(themeState: ThemeState, onClose: () -> Unit) {
    LudoModal(
        open = true,
        title = Strings.TITLE_THEME_PICKER,
        onClose = onClose,
        footer = {
            LudoButton(text = Strings.BTN_CLOSE, variant = ButtonVariant.Secondary, onClick = onClose)
        },
    ) {
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
    }
}
