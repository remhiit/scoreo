package com.scoreo.ui.player

import com.scoreo.application.PlayerStats
import com.scoreo.domain.model.Player

data class PlayerState(
    val players: List<Player> = emptyList(),
    val stats: Map<String, PlayerStats> = emptyMap(),
    val inputName: String = "",
    val error: String? = null,
)
