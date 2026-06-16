package com.scoreo.application

import com.scoreo.domain.port.CloudSyncRepository
import kotlinx.datetime.toLocalDateTime
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository
import com.scoreo.domain.port.SyncData
import com.scoreo.domain.port.SyncException
import com.scoreo.domain.port.SyncStatus

data class SyncSnapshot(
    val playerCount: Int,
    val matchCount: Int,
    val gameTypeCount: Int,
    val lastModified: Long,
    val dateLabel: String?,
)

data class SyncConflict(
    val localSnapshot: SyncSnapshot,
    val remoteSnapshot: SyncSnapshot,
)

data class SyncResult(
    val pushed: Int = 0,
    val pulled: Int = 0,
    val timestamp: Long,
)

sealed class SyncOutcome {
    data class Synced(val result: SyncResult) : SyncOutcome()
    data class Conflict(val conflict: SyncConflict) : SyncOutcome()
}

class SyncUseCase(
    private val cloudRepo: CloudSyncRepository,
    private val playerRepo: PlayerRepository,
    private val gameTypeRepo: GameTypeRepository,
    private val matchRepo: MatchRepository,
) {
    fun autoSync(): SyncOutcome {
        val localData = buildLocalSyncData()
        val remoteData = cloudRepo.pull()

        val localEmpty = localData.players.isEmpty() && localData.gameTypes.isEmpty() && localData.matches.isEmpty()
        val remoteEmpty = remoteData.players.isEmpty() && remoteData.gameTypes.isEmpty() && remoteData.matches.isEmpty()

        when {
            localEmpty && remoteEmpty -> return SyncOutcome.Synced(SyncResult(timestamp = now()))
            remoteEmpty -> {
                cloudRepo.push(localData)
                return SyncOutcome.Synced(
                    SyncResult(
                        pushed = localData.players.size + localData.gameTypes.size + localData.matches.size,
                        timestamp = now(),
                    )
                )
            }
            localEmpty -> {
                writeRemoteToLocal(remoteData)
                return SyncOutcome.Synced(
                    SyncResult(
                        pulled = remoteData.players.size + remoteData.gameTypes.size + remoteData.matches.size,
                        timestamp = now(),
                    )
                )
            }
            else -> {
                if (isSameState(localData, remoteData)) {
                    return SyncOutcome.Synced(SyncResult(timestamp = now()))
                }
                return SyncOutcome.Conflict(
                    SyncConflict(
                        localSnapshot = toSnapshot(localData),
                        remoteSnapshot = toSnapshot(remoteData),
                    )
                )
            }
        }
    }

    fun resolveConflict(keepLocal: Boolean): SyncResult {
        if (keepLocal) {
            val localData = buildLocalSyncData()
            cloudRepo.push(localData)
            return SyncResult(
                pushed = localData.players.size + localData.gameTypes.size + localData.matches.size,
                timestamp = now(),
            )
        } else {
            val remoteData = cloudRepo.pull()
            writeRemoteToLocal(remoteData)
            return SyncResult(
                pulled = remoteData.players.size + remoteData.gameTypes.size + remoteData.matches.size,
                timestamp = now(),
            )
        }
    }

    fun login() {
        cloudRepo.login()
    }

    fun logout() {
        cloudRepo.logout()
    }

    fun status(): SyncStatus = cloudRepo.getStatus()

    // ── Private ──

    private fun buildLocalSyncData(): SyncData {
        val players = playerRepo.getAll(includeInactive = true)
        val gameTypes = gameTypeRepo.getAll()
        val matches = matchRepo.getAll()
        return SyncData(
            players = players,
            gameTypes = gameTypes,
            matches = matches,
            lastModified = now(),
        )
    }

    private fun writeRemoteToLocal(data: SyncData) {
        data.players.forEach { playerRepo.save(it) }
        data.gameTypes.forEach { gameTypeRepo.save(it) }
        data.matches.forEach { matchRepo.save(it) }
    }

    private fun isSameState(a: SyncData, b: SyncData): Boolean {
        return a.players.size == b.players.size
            && a.gameTypes.size == b.gameTypes.size
            && a.matches.size == b.matches.size
            && a.lastModified == b.lastModified
    }

    private fun toSnapshot(data: SyncData): SyncSnapshot = SyncSnapshot(
        playerCount = data.players.size,
        matchCount = data.matches.size,
        gameTypeCount = data.gameTypes.size,
        lastModified = data.lastModified,
        dateLabel = formatDate(data.lastModified),
    )

    private fun formatDate(epochMs: Long): String? {
        if (epochMs <= 0L) return null
        return try {
            val instant = kotlinx.datetime.Instant.fromEpochMilliseconds(epochMs)
            val local = instant.toLocalDateTime(kotlinx.datetime.TimeZone.currentSystemDefault())
            "${local.dayOfMonth} ${local.month.name.lowercase().take(3)} ${local.year}"
        } catch (_: Exception) { null }
    }

    companion object {
        private fun now(): Long =
            kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
    }
}
