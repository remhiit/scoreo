package com.scoreo.ui.import

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.ImportMatchesUseCase

class ImportHandler(
    private val importUseCase: ImportMatchesUseCase,
) {
    var state by mutableStateOf(ImportState())
        private set

    fun handle(intent: ImportIntent) {
        when (intent) {
            is ImportIntent.FileLoaded -> {
                val previewResult = importUseCase.preview(intent.content)
                previewResult.fold(
                    onSuccess = { preview ->
                        state = state.copy(
                            step = ImportStep.READY,
                            preview = preview,
                            jsonContent = intent.content,
                            error = null,
                        )
                    },
                    onFailure = { e ->
                        state = state.copy(
                            step = ImportStep.IDLE,
                            preview = null,
                            jsonContent = "",
                            error = "Invalid file: ${e.message}",
                        )
                    },
                )
            }

            is ImportIntent.Execute -> {
                if (state.step != ImportStep.READY) return
                state = state.copy(error = null)
                val result = importUseCase.execute(state.jsonContent)
                result.fold(
                    onSuccess = { res ->
                        state = state.copy(
                            step = ImportStep.DONE,
                            result = res,
                        )
                    },
                    onFailure = { e ->
                        state = state.copy(
                            step = ImportStep.IDLE,
                            error = "Import failed: ${e.message}",
                        )
                    },
                )
            }

            is ImportIntent.FileError -> {
                state = state.copy(
                    step = ImportStep.IDLE,
                    error = intent.message,
                )
            }

            is ImportIntent.Reset -> {
                state = ImportState()
            }
        }
    }
}
