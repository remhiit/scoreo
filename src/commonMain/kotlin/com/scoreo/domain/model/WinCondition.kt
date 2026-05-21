package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class WinCondition {
    HIGHEST_SCORE,
    LOWEST_SCORE,
    MANUAL,
}
