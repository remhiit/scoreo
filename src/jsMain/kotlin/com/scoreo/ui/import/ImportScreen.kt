package com.scoreo.ui.import

import androidx.compose.runtime.Composable
import com.scoreo.ui.Strings
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Label
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text
import org.w3c.dom.HTMLInputElement
import org.w3c.files.FileReader

@Composable
fun ImportScreen(
    handler: ImportHandler,
    onDone: () -> Unit,
) {
    val state = handler.state

    when (state.step) {
        ImportStep.IDLE -> {
            Label(attrs = { classes("import-zone") }) {
                Span(attrs = { classes("import-zone-icon") }) { Text("📥") }
                Span(attrs = { classes("import-zone-text") }) { Text(Strings.MSG_SELECT_JSON) }
                Input(type = InputType.File, attrs = {
                    attr("accept", ".json,application/json")
                    onChange { event ->
                        val input = (event.target as? HTMLInputElement) ?: return@onChange
                        val file = input.files?.item(0) ?: return@onChange
                        val reader = FileReader()
                        reader.onload = { _ ->
                            (reader.result as? String)?.let { handler.handle(ImportIntent.FileLoaded(it)) }
                        }
                        reader.onerror = { _ ->
                            handler.handle(ImportIntent.FileError("Failed to read file"))
                        }
                        reader.onabort = { _ ->
                            handler.handle(ImportIntent.FileError("File read was aborted"))
                        }
                        reader.readAsText(file)
                        input.value = ""
                    }
                })
            }
            state.error?.let { msg ->
                Div(attrs = { classes("error-msg") }) { Text(msg) }
            }
        }

        ImportStep.READY -> {
            val preview = state.preview ?: return
            Div(attrs = { classes("import-preview") }) {
                Div(attrs = { classes("import-preview-row") }) {
                    Span(attrs = { classes("import-preview-label") }) { Text(Strings.LABEL_GAME_IMPORT) }
                    Span(attrs = { classes("import-preview-value") }) { Text(preview.gameName) }
                 }
                 Div(attrs = { classes("import-preview-row") }) {
                     Span(attrs = { classes("import-preview-label") }) { Text(Strings.LABEL_MATCHES_TO_IMPORT) }
                    Span(attrs = { classes("import-preview-value") }) { Text("${preview.count}") }
                }
            }
            Button(attrs = {
                classes("btn", "btn-primary", "btn-full")
                onClick { handler.handle(ImportIntent.Execute) }
             }) { Text(Strings.BTN_IMPORT) }
        }

        ImportStep.DONE -> {
            val result = state.result ?: return
            Div(attrs = { classes("import-result") }) {
                Div(attrs = { classes("import-result-line", "import-success") }) {
                     Text(Strings.MSG_IMPORTED.replace("{count}", result.imported.toString()))
                 }
                 if (result.skipped.isNotEmpty()) {
                     Div(attrs = { classes("import-result-line", "import-warn") }) {
                         Text(Strings.MSG_SKIPPED.replace("{count}", result.skipped.size.toString()))
                     }
                 }
                 if (result.failed.isNotEmpty()) {
                     Div(attrs = { classes("import-result-line", "import-error") }) {
                         Text(Strings.MSG_FAILED.replace("{count}", result.failed.size.toString()))
                        result.failed.forEach { id ->
                            Div(attrs = { classes("import-failed-id") }) { Text(id) }
                        }
                    }
                }
            }
            Button(attrs = {
                classes("btn", "btn-primary", "btn-full")
                onClick {
                    handler.handle(ImportIntent.Reset)
                    onDone()
                }
             }) { Text(Strings.BTN_DONE) }
        }
    }
}
