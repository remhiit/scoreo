package com.scoreo.di

import com.scoreo.application.SyncUseCase
import com.scoreo.domain.port.CloudSyncRepository
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository
import com.scoreo.ui.sync.SyncHandler
import kotlinx.coroutines.MainScope

fun createSyncHandlerIfAvailable(
    cloudSyncRepository: CloudSyncRepository?,
    playerRepository: PlayerRepository,
    gameTypeRepository: GameTypeRepository,
    matchRepository: MatchRepository,
): SyncHandler? {
    return cloudSyncRepository?.let { repo ->
        SyncHandler(
            SyncUseCase(repo, playerRepository, gameTypeRepository, matchRepository),
            MainScope(),
        )
    }
}
