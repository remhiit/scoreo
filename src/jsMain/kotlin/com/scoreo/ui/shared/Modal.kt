package com.scoreo.ui.shared

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import kotlinx.browser.window
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H2
import org.jetbrains.compose.web.dom.Text
import org.w3c.dom.events.Event
import org.w3c.dom.events.KeyboardEvent

/**
 * Centered dialog with scrim, for add/edit flows, confirmations, or
 * rules. Closes on scrim click or Escape. Ported from the Ludo design
 * system's Modal component — since Compose HTML already diffs the DOM
 * for us, `open: Boolean` driving `if (open) { ... }` is enough (no
 * need for the vanilla-JS version's persistent open()/close()
 * controller object).
 */
@Composable
fun LudoModal(
    open: Boolean,
    title: String? = null,
    onClose: (() -> Unit)? = null,
    footer: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    if (!open) return

    DisposableEffect(Unit) {
        val listener: (Event) -> Unit = { e ->
            if (e is KeyboardEvent && e.key == "Escape") onClose?.invoke()
        }
        window.addEventListener("keydown", listener)
        onDispose { window.removeEventListener("keydown", listener) }
    }

    Div(attrs = {
        classes("ludo-modal-scrim")
        onClick { onClose?.invoke() }
    }) {
        Div(attrs = {
            classes("ludo-modal")
            attr("role", "dialog")
            attr("aria-modal", "true")
            if (title != null) attr("aria-label", title)
            onClick { it.stopPropagation() }
        }) {
            if (title != null) {
                Div(attrs = { classes("ludo-modal__header") }) {
                    H2(attrs = { classes("ludo-modal__title") }) { Text(title) }
                    if (onClose != null) {
                        Button(attrs = {
                            classes("ludo-modal__close")
                            attr("aria-label", "Close")
                            onClick { onClose() }
                        }) { Text("×") }
                    }
                }
            }
            Div(attrs = { classes("ludo-modal__body") }) { content() }
            if (footer != null) {
                Div(attrs = { classes("ludo-modal__footer") }) { footer() }
            }
        }
    }
}
