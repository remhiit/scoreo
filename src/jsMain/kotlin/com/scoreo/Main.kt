package com.scoreo

import com.scoreo.infrastructure.LocalStorageGameTypeRepository
import com.scoreo.infrastructure.LocalStorageMatchRepository
import com.scoreo.infrastructure.LocalStoragePlayerRepository
import com.scoreo.infrastructure.google.GoogleAuthService
import com.scoreo.infrastructure.google.GoogleDriveSyncAdapter
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.compose.web.renderComposable
import org.w3c.dom.get
import kotlinx.browser.document

// Google OAuth Client ID — configure with your own from Google Cloud Console
private const val GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"

fun main() {
    val playerRepository = LocalStoragePlayerRepository()
    val gameTypeRepository = LocalStorageGameTypeRepository()
    val matchRepository = LocalStorageMatchRepository()

    // Instantiate Google Drive Sync adapter (wired and ready to use)
    val authService = GoogleAuthService()
    val cloudSyncRepository = GoogleDriveSyncAdapter(
        authService = authService,
        clientId = GOOGLE_CLIENT_ID,
    )

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
