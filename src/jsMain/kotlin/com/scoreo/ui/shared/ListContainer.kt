package com.scoreo.ui.shared

import androidx.compose.runtime.Composable
import org.jetbrains.compose.web.dom.Div

@Composable
fun ListContainer(
    className: String? = null,
    content: @Composable () -> Unit,
) {
    Div(attrs = {
        classes("list-container")
        if (className != null) classes(className)
    }) {
        content()
    }
}
