package com.scoreo.application

data class PlayerDetail(
    val playerId: String,
    val name: String,
    val wins: Int,
    val losses: Int,
    val headToHead: List<HeadToHeadEntry>,
)

data class HeadToHeadEntry(
    val opponentId: String,
    val opponentName: String,
    val wins: Int,
    val losses: Int,
)
