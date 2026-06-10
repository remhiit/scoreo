package com.scoreo.application

import com.scoreo.FakeGameTypeRepository
import com.scoreo.FakeMatchRepository
import com.scoreo.FakePlayerRepository
import com.scoreo.TestImportData
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ImportMatchesUseCaseTest {

    private fun useCase(
        playerRepo: FakePlayerRepository = FakePlayerRepository(),
        gameTypeRepo: FakeGameTypeRepository = FakeGameTypeRepository(),
        matchRepo: FakeMatchRepository = FakeMatchRepository(),
        currentDate: () -> Long = { 1767225600000L },
    ) = ImportMatchesUseCase(playerRepo, gameTypeRepo, matchRepo, currentDate)

    // --- Preview ---

    @Test
    fun `preview returns game name and count for valid JSON`() {
        val result = useCase().preview(TestImportData.validJson)
        assertTrue(result.isSuccess)
        val preview = result.getOrThrow()
        assertEquals("TestGame", preview.gameName)
        assertEquals(1, preview.count)
    }

    @Test
    fun `preview returns failure for invalid JSON`() {
        val result = useCase().preview(TestImportData.invalidJson)
        assertTrue(result.isFailure)
    }

    @Test
    fun `preview returns failure for unsupported version`() {
        val json = """{"version": "2.0", "game": "X", "games": []}"""
        val result = useCase().preview(json)
        assertTrue(result.isFailure)
    }

    @Test
    fun `preview returns failure for empty games`() {
        val result = useCase().preview(TestImportData.emptyGamesJson)
        assertTrue(result.isFailure)
    }

    @Test
    fun `preview returns failure for games with fewer than 2 entries`() {
        val json = """{
            "version": "1.1",
            "game": "X",
            "games": [{"id": "m1", "ranking": [{"name":"A","score":1,"rank":1}]}]
        }"""
        val result = useCase().preview(json)
        assertTrue(result.isFailure)
    }

    // --- Execute ---

    @Test
    fun `execute imports matches and returns count`() {
        val uc = useCase()
        val result = uc.execute(TestImportData.validJson)
        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrThrow().imported)
    }

    @Test
    fun `execute saves matches to repository`() {
        val matchRepo = FakeMatchRepository()
        val uc = useCase(matchRepo = matchRepo)
        uc.execute(TestImportData.validJson)
        assertEquals(1, matchRepo.getAll().size)
    }

    @Test
    fun `execute auto-creates game type`() {
        val gameTypeRepo = FakeGameTypeRepository()
        val uc = useCase(gameTypeRepo = gameTypeRepo)
        uc.execute(TestImportData.validJson)
        val gameTypes = gameTypeRepo.getAll()
        assertEquals(1, gameTypes.size)
        assertEquals("TestGame", gameTypes.first().name)
    }

    @Test
    fun `execute reuses existing game type by name`() {
        val gameTypeRepo = FakeGameTypeRepository()
        gameTypeRepo.save(GameType("existing", "TestGame", WinCondition.MANUAL))
        val uc = useCase(gameTypeRepo = gameTypeRepo)
        uc.execute(TestImportData.validJson)
        assertEquals(1, gameTypeRepo.getAll().size)
        assertEquals("existing", gameTypeRepo.getAll().first().id)
    }

    @Test
    fun `execute auto-creates unknown players`() {
        val playerRepo = FakePlayerRepository()
        val uc = useCase(playerRepo = playerRepo)
        uc.execute(TestImportData.validJson)
        val players = playerRepo.getAll()
        assertEquals(2, players.size)
        assertTrue(players.any { it.name == "Alice" })
        assertTrue(players.any { it.name == "Bob" })
    }

    @Test
    fun `execute reuses existing players by name`() {
        val playerRepo = FakePlayerRepository()
        playerRepo.save(Player("p1", "Alice"))
        val uc = useCase(playerRepo = playerRepo)
        uc.execute(TestImportData.validJson)
        assertEquals(2, playerRepo.getAll().size)
    }

    @Test
    fun `execute skips matches with duplicate IDs`() {
        val matchRepo = FakeMatchRepository()
        matchRepo.save(Match("m1", 0L, "", listOf(), manualWinners = listOf()))
        val uc = useCase(matchRepo = matchRepo)
        val result = uc.execute(TestImportData.validJson)
        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrThrow().imported)
        assertEquals(1, result.getOrThrow().skipped.size)
    }

    @Test
    fun `execute with detail verification passes when sums match`() {
        val uc = useCase()
        val result = uc.execute(TestImportData.withDetailsJson)
        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrThrow().imported)
    }

    @Test
    fun `execute with detail verification fails when sums mismatch`() {
        val matchRepo = FakeMatchRepository()
        val uc = useCase(matchRepo = matchRepo)
        val result = uc.execute(TestImportData.withMismatchedDetailsJson)
        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrThrow().imported)
        assertEquals(1, result.getOrThrow().failed.size)
    }

    @Test
    fun `execute without date uses currentDate fallback`() {
        val matchRepo = FakeMatchRepository()
        val uc = useCase(matchRepo = matchRepo, currentDate = { 999999L })
        uc.execute(TestImportData.withoutDateJson)
        assertEquals(1, matchRepo.getAll().size)
        assertEquals(999999L, matchRepo.getAll().first().date)
    }

    @Test
    fun `execute imports multiple games`() {
        val matchRepo = FakeMatchRepository()
        val uc = useCase(matchRepo = matchRepo)
        val result = uc.execute(TestImportData.multiGameJson)
        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrThrow().imported)
        assertEquals(2, matchRepo.getAll().size)
    }

    @Test
    fun `execute with duplicate in first game still imports others`() {
        val matchRepo = FakeMatchRepository()
        matchRepo.save(Match("m1", 0L, "", listOf(), manualWinners = listOf()))
        val uc = useCase(matchRepo = matchRepo)
        val result = uc.execute(TestImportData.multiGameJson)
        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrThrow().imported)
        assertEquals(1, result.getOrThrow().skipped.size)
    }
}
