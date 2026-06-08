package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class WinCondition {
    HIGHEST_SCORE,
    LOWEST_SCORE,
    MANUAL;

    fun label() = when (this) {
        HIGHEST_SCORE -> "Highest score"
        LOWEST_SCORE -> "Lowest score"
        MANUAL -> "Manual"
    }
}
