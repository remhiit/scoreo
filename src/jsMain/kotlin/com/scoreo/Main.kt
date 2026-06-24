package com.scoreo

import com.scoreo.infrastructure.LocalStorageGameTypeRepository
import com.scoreo.infrastructure.LocalStorageMatchRepository
import com.scoreo.infrastructure.LocalStoragePlayerRepository
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.compose.web.renderComposable
import org.w3c.dom.get
import kotlinx.browser.document

fun main() {
    val playerRepository = LocalStoragePlayerRepository()
    val gameTypeRepository = LocalStorageGameTypeRepository()
    val matchRepository = LocalStorageMatchRepository()

    renderComposable(rootElementId = "root") {
        App(
            playerRepository = playerRepository,
            gameTypeRepository = gameTypeRepository,
            matchRepository = matchRepository,
            currentDate = { Clock.System.now().toEpochMilliseconds() },
        )
    }

    // Hide splash after rendering
    val splash = document.getElementById("splash")
    if (splash != null) {
        splash.classList.add("hidden")
    }
}
