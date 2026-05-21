package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class PlayerScore(
    val playerId: String,
    val score: Int,
)
