package com.scoreo

import com.scoreo.infrastructure.LocalStorageGameTypeRepository
import com.scoreo.infrastructure.LocalStorageMatchRepository
import com.scoreo.infrastructure.LocalStoragePlayerRepository
import com.scoreo.infrastructure.google.GoogleAuthService
import com.scoreo.infrastructure.google.GoogleDriveSyncAdapter
import com.scoreo.infrastructure.google.OAuthConfig
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

    val cloudSyncRepository = if (OAuthConfig.CLIENT_ID.isNotBlank()) {
        GoogleDriveSyncAdapter(
            authService = GoogleAuthService(),
            clientId = OAuthConfig.CLIENT_ID,
        )
    } else null

    renderComposable(rootElementId = "root") {
        App(
            playerRepository = playerRepository,
            gameTypeRepository = gameTypeRepository,
            matchRepository = matchRepository,
            currentDate = { Clock.System.now().toEpochMilliseconds() },
            cloudSyncRepository = cloudSyncRepository,
        )
    }

    // Hide splash after rendering
    val splash = document.getElementById("splash")
    if (splash != null) {
        splash.classList.add("hidden")
    }
}
