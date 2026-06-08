package com.scoreo.ui.import

import com.scoreo.application.ImportPreview
import com.scoreo.application.ImportResult

data class ImportState(
    val step: ImportStep = ImportStep.IDLE,
    val preview: ImportPreview? = null,
    val jsonContent: String = "",
    val result: ImportResult? = null,
    val error: String? = null,
)

enum class ImportStep { IDLE, READY, DONE }
