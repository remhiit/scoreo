package com.scoreo

import com.scoreo.infrastructure.LocalStorageGameTypeRepository
import com.scoreo.infrastructure.LocalStorageMatchRepository
import com.scoreo.infrastructure.LocalStoragePlayerRepository
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
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
            currentDate = { Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date.toString() },
        )
    }
}
