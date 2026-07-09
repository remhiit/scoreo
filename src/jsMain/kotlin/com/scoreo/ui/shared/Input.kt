package com.scoreo.ui.shared

import androidx.compose.runtime.Composable
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Label
import org.jetbrains.compose.web.dom.Text

private fun clamp(n: Int, min: Int?, max: Int?): Int {
    var v = n
    if (min != null) v = maxOf(min, v)
    if (max != null) v = minOf(max, v)
    return v
}

/** Plain text field. Controlled: `value` always reflects the caller's state. */
@Composable
fun LudoTextInput(
    value: String,
    onChange: (String) -> Unit,
    label: String? = null,
    placeholder: String? = null,
    size: ButtonSize = ButtonSize.Md,
    disabled: Boolean = false,
) {
    Div(attrs = { classes("ludo-field") }) {
        if (label != null) {
            Label(attrs = { classes("ludo-field__label") }) { Text(label) }
        }
        val currentValue = value
        val currentPlaceholder = placeholder
        Input(type = InputType.Text, attrs = {
            classes("ludo-input", "ludo-input--${size.cssName()}", "ludo-input--bare")
            value(currentValue)
            if (currentPlaceholder != null) attr("placeholder", currentPlaceholder)
            if (disabled) attr("disabled", "")
            onInput { onChange(it.value) }
        })
    }
}

/**
 * Number field. Defaults to a stepper (-, value, +) sized for
 * one-thumb tapping, matching the Ludo design system's score-entry
 * fields — pass `stepper = false` for a plain numeric field.
 *
 * Unlike the design system's vanilla-JS `Ludo.Input` (which had to be
 * an *uncontrolled* component to avoid Compose-less DOM rebuilds
 * stealing focus), this is a normal *controlled* Compose HTML
 * composable: `value` always reflects the caller's state, and the
 * +/- buttons' disabled-at-bounds state recomputes for free on every
 * recomposition — no manual sync needed.
 */
@Composable
fun LudoNumberInput(
    value: Int,
    onChange: (Int) -> Unit,
    min: Int? = null,
    max: Int? = null,
    step: Int = 1,
    stepper: Boolean = true,
    size: ButtonSize = ButtonSize.Md,
    disabled: Boolean = false,
) {
    Div(attrs = { classes("ludo-field") }) {
        if (stepper) {
            Div(attrs = { classes("ludo-stepper") }) {
                LudoButton(
                    text = "−",
                    variant = ButtonVariant.Secondary,
                    size = size,
                    iconOnly = true,
                    disabled = disabled || (min != null && value <= min),
                    ariaLabel = "Decrease",
                    onClick = { onChange(clamp(value - step, min, max)) },
                )
                val currentValue = value
                Input(type = InputType.Number, attrs = {
                    classes(
                        "ludo-input",
                        "ludo-input--${size.cssName()}",
                        "ludo-input--stepper-field",
                        "ludo-input--mono",
                    )
                    value(currentValue)
                    attr("inputmode", "numeric")
                    if (min != null) attr("min", min.toString())
                    if (max != null) attr("max", max.toString())
                    attr("step", step.toString())
                    if (disabled) attr("disabled", "")
                    onInput { e -> e.value.toString().toIntOrNull()?.let { onChange(clamp(it, min, max)) } }
                })
                LudoButton(
                    text = "+",
                    variant = ButtonVariant.Secondary,
                    size = size,
                    iconOnly = true,
                    disabled = disabled || (max != null && value >= max),
                    ariaLabel = "Increase",
                    onClick = { onChange(clamp(value + step, min, max)) },
                )
            }
        } else {
            val currentValue = value
            Input(type = InputType.Number, attrs = {
                classes("ludo-input", "ludo-input--${size.cssName()}", "ludo-input--bare", "ludo-input--mono")
                value(currentValue)
                attr("inputmode", "numeric")
                if (min != null) attr("min", min.toString())
                if (max != null) attr("max", max.toString())
                attr("step", step.toString())
                if (disabled) attr("disabled", "")
                onInput { e -> e.value.toString().toIntOrNull()?.let { onChange(clamp(it, min, max)) } }
            })
        }
    }
}
