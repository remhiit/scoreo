package com.scoreo.domain.model

import kotlinx.serialization.Serializable
import kotlinx.datetime.Clock

@Serializable
data class MatchDraft(
    val gameTypeId: String,
    val playerIds: List<String>,
    val rounds: List<Map<String, String>>, // playerIds -> score string
    val updatedAt: Long = Clock.System.now().toEpochMilliseconds()
)
