package com.scoreo.ui.shared

import androidx.compose.runtime.Composable
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Text

enum class ButtonVariant { Primary, Secondary, Ghost, Danger }
enum class ButtonSize { Sm, Md, Lg }

private fun ButtonVariant.cssName() = when (this) {
    ButtonVariant.Primary -> "primary"
    ButtonVariant.Secondary -> "secondary"
    ButtonVariant.Ghost -> "ghost"
    ButtonVariant.Danger -> "danger"
}

/** Internal (not private): reused by Input.kt's stepper field sizing. */
internal fun ButtonSize.cssName() = when (this) {
    ButtonSize.Sm -> "sm"
    ButtonSize.Md -> "md"
    ButtonSize.Lg -> "lg"
}

/**
 * The single interactive-action primitive from the Ludo design
 * system — primary/secondary/ghost/danger intents, 3 sizes, an
 * icon-only square mode for +/- style steppers. Named `LudoButton`
 * (not `Button`) to avoid colliding with
 * `org.jetbrains.compose.web.dom.Button`, which it wraps.
 */
@Composable
fun LudoButton(
    text: String,
    variant: ButtonVariant = ButtonVariant.Primary,
    size: ButtonSize = ButtonSize.Md,
    iconOnly: Boolean = false,
    disabled: Boolean = false,
    ariaLabel: String? = null,
    onClick: () -> Unit,
) {
    Button(attrs = {
        classes("ludo-btn", "ludo-btn--${variant.cssName()}", "ludo-btn--${size.cssName()}")
        if (iconOnly) classes("ludo-btn--icon")
        if (disabled) attr("disabled", "")
        if (ariaLabel != null) attr("aria-label", ariaLabel)
        onClick { if (!disabled) onClick() }
    }) { Text(text) }
}
