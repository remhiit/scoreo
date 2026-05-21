package com.scoreo

import com.scoreo.infrastructure.LocalStorageGameTypeRepository
import com.scoreo.infrastructure.LocalStorageMatchRepository
import com.scoreo.infrastructure.LocalStoragePlayerRepository
import org.jetbrains.compose.web.renderComposable

fun main() {
    val playerRepository = LocalStoragePlayerRepository()
    val gameTypeRepository = LocalStorageGameTypeRepository()
    val matchRepository = LocalStorageMatchRepository()

    renderComposable(rootElementId = "root") {
        App(
            playerRepository = playerRepository,
            gameTypeRepository = gameTypeRepository,
            matchRepository = matchRepository,
            currentDate = { js("new Date().toISOString().split('T')[0]") as String },
        )
    }
}
