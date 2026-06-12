package com.scoreo.ui.import

sealed class ImportIntent {
    data class FileLoaded(val content: String) : ImportIntent()
    data class FileError(val message: String) : ImportIntent()
    data object Execute : ImportIntent()
    data object Reset : ImportIntent()
}
