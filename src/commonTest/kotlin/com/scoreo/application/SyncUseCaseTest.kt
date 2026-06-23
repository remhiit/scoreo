package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.SyncData
import com.scoreo.infrastructure.InMemoryCloudSyncRepository
import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SyncUseCaseTest {

    private fun buildUseCase(
        cloudRepo: InMemoryCloudSyncRepository = InMemoryCloudSyncRepository(),
        playerRepo: InMemoryPlayerRepository = InMemoryPlayerRepository(),
        gameTypeRepo: InMemoryGameTypeRepository = InMemoryGameTypeRepository(),
        matchRepo: InMemoryMatchRepository = InMemoryMatchRepository(),
    ) = SyncUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    @Test
    fun `autoSync both empty returns Synced with zero counts`() {
        val cloudRepo = InMemoryCloudSyncRepository().also { it.login() }
        val useCase = buildUseCase(cloudRepo = cloudRepo)

        val outcome = useCase.autoSync()

        assertTrue(outcome is SyncOutcome.Synced, "Expected Synced but got $outcome")
        val synced = outcome as SyncOutcome.Synced
        assertEquals(0, synced.result.pushed)
        assertEquals(0, synced.result.pulled)
        assertTrue(synced.result.timestamp > 0L)
    }

    @Test
    fun `autoSync local has data remote empty pushes to remote`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        }
        val cloudRepo = InMemoryCloudSyncRepository().also { it.login() }
        val useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

        val outcome = useCase.autoSync()

        assertTrue(outcome is SyncOutcome.Synced, "Expected Synced but got $outcome")
        val synced = outcome as SyncOutcome.Synced
        assertEquals(3, synced.result.pushed)
        assertEquals(0, synced.result.pulled)
        assertTrue(synced.result.timestamp > 0L)

        // Verify data was pushed to remote
        val pushed = cloudRepo.storedData!!
        assertEquals(1, pushed.players.size)
        assertEquals(1, pushed.gameTypes.size)
        assertEquals(1, pushed.matches.size)
    }

    @Test
    fun `autoSync remote has data local empty pulls to local`() {
        val cloudRepo = InMemoryCloudSyncRepository().also {
            it.login()
            it.storedData = SyncData(
                players = listOf(Player("p1", "Alice")),
                gameTypes = listOf(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE)),
                matches = listOf(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))),
                lastModified = 1000L,
            )
        }
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

        val outcome = useCase.autoSync()

        assertTrue(outcome is SyncOutcome.Synced, "Expected Synced but got $outcome")
        val synced = outcome as SyncOutcome.Synced
        assertEquals(0, synced.result.pushed)
        assertEquals(3, synced.result.pulled)
        assertTrue(synced.result.timestamp > 0L)

        // Verify data was pulled to local
        assertEquals(1, playerRepo.getAll(includeInactive = true).size)
        assertEquals(1, gameTypeRepo.getAll().size)
        assertEquals(1, matchRepo.getAll().size)
    }

    @Test
    fun `autoSync both have same data returns Synced`() {
        val cloudRepo = InMemoryCloudSyncRepository().also {
            it.login()
            it.storedData = SyncData(
                players = listOf(Player("p1", "Alice")),
                gameTypes = listOf(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE)),
                matches = listOf(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))),
                lastModified = 1000L,
            )
        }
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        }
        val useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

        val outcome = useCase.autoSync()

        assertTrue(outcome is SyncOutcome.Synced, "Expected Synced but got $outcome")
        val synced = outcome as SyncOutcome.Synced
        assertEquals(0, synced.result.pushed)
        assertEquals(0, synced.result.pulled)
        assertTrue(synced.result.timestamp > 0L)
    }

    @Test
    fun `autoSync both have different data returns Conflict`() {
        val cloudRepo = InMemoryCloudSyncRepository().also {
            it.login()
            it.storedData = SyncData(
                players = listOf(Player("p2", "Bob")),
                gameTypes = listOf(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE)),
                matches = listOf(Match("m1", 1000L, "gt1", listOf(PlayerScore("p2", 10)))),
                lastModified = 1000L,
            )
        }
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        }
        val useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

        val outcome = useCase.autoSync()

        assertTrue(outcome is SyncOutcome.Conflict, "Expected Conflict but got $outcome")
        val conflict = outcome as SyncOutcome.Conflict
        assertEquals(1, conflict.conflict.localSnapshot.playerCount)
        assertEquals(1, conflict.conflict.remoteSnapshot.playerCount)
        assertEquals(1, conflict.conflict.localSnapshot.matchCount)
        assertEquals(1, conflict.conflict.remoteSnapshot.matchCount)
        assertEquals(1, conflict.conflict.localSnapshot.gameTypeCount)
        assertEquals(1, conflict.conflict.remoteSnapshot.gameTypeCount)
    }

    @Test
    fun `resolveConflict keepLocal pushes local data to remote`() {
        val cloudRepo = InMemoryCloudSyncRepository().also { it.login() }
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        }
        val useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

        val result = useCase.resolveConflict(keepLocal = true)

        assertEquals(4, result.pushed)
        assertEquals(0, result.pulled)
        assertTrue(result.timestamp > 0L)

        // Verify local data was pushed to remote
        val pushed = cloudRepo.storedData!!
        assertEquals(2, pushed.players.size)
        assertEquals(1, pushed.gameTypes.size)
        assertEquals(1, pushed.matches.size)
    }

    @Test
    fun `resolveConflict keepRemote pulls remote data to local`() {
        val cloudRepo = InMemoryCloudSyncRepository().also {
            it.login()
            it.storedData = SyncData(
                players = listOf(Player("p1", "Alice"), Player("p2", "Bob")),
                gameTypes = listOf(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE)),
                matches = listOf(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))),
                lastModified = 1000L,
            )
        }
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

        val result = useCase.resolveConflict(keepLocal = false)

        assertEquals(0, result.pushed)
        assertEquals(4, result.pulled)
        assertTrue(result.timestamp > 0L)

        // Verify remote data was pulled to local
        assertEquals(2, playerRepo.getAll(includeInactive = true).size)
        assertEquals(1, gameTypeRepo.getAll().size)
        assertEquals(1, matchRepo.getAll().size)
    }
}
