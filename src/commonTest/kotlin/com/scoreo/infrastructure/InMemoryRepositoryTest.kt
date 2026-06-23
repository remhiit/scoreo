package com.scoreo.infrastructure

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class InMemoryRepositoryTest {

    @Test
    fun `PlayerRepository save deux fois avec le meme id ne cree pas de doublon`() {
        val repo = InMemoryPlayerRepository()
        val player = Player("p1", "Alice")

        repo.save(player)
        assertEquals(1, repo.getAll(includeInactive = true).size)

        repo.save(player.copy(name = "Alice modifie"))
        assertEquals(1, repo.getAll(includeInactive = true).size)
        assertEquals("Alice modifie", repo.getAll(includeInactive = true).first().name)
    }

    @Test
    fun `PlayerRepository save id different ajoute un nouvel element`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        repo.save(Player("p2", "Bob"))

        assertEquals(2, repo.getAll(includeInactive = true).size)
    }

    @Test
    fun `GameTypeRepository save deux fois avec le meme id ne cree pas de doublon`() {
        val repo = InMemoryGameTypeRepository()
        val gt = GameType("gt1", "Belote", WinCondition.HIGHEST_SCORE)

        repo.save(gt)
        assertEquals(1, repo.getAll().size)

        repo.save(gt.copy(name = "Belote modifie"))
        assertEquals(1, repo.getAll().size)
        assertEquals("Belote modifie", repo.getAll().first().name)
    }

    @Test
    fun `GameTypeRepository save id different ajoute un nouvel element`() {
        val repo = InMemoryGameTypeRepository()
        repo.save(GameType("gt1", "Belote", WinCondition.HIGHEST_SCORE))
        repo.save(GameType("gt2", "Tarot", WinCondition.LOWEST_SCORE))

        assertEquals(2, repo.getAll().size)
    }

    @Test
    fun `MatchRepository save deux fois avec le meme id ne cree pas de doublon`() {
        val repo = InMemoryMatchRepository()
        val match = Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)), emptyList())

        repo.save(match)
        assertEquals(1, repo.getAll().size)

        repo.save(match.copy(date = 2000L))
        assertEquals(1, repo.getAll().size)
        assertEquals(2000L, repo.getAll().first().date)
    }

    @Test
    fun `MatchRepository save id different ajoute un nouvel element`() {
        val repo = InMemoryMatchRepository()
        repo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)), emptyList()))
        repo.save(Match("m2", 2000L, "gt1", listOf(PlayerScore("p2", 20)), emptyList()))

        assertEquals(2, repo.getAll().size)
    }

    @Test
    fun `PlayerRepository findById via save upsert conserve les donnees`() {
        val repo = InMemoryPlayerRepository()
        val player = Player("p1", "Alice")
        repo.save(player)
        val fromGetAll = repo.getAll(includeInactive = true).first()
        assertNotNull(fromGetAll)
        assertEquals("Alice", fromGetAll.name)
    }

    @Test
    fun `GameTypeRepository findById via save upsert conserve les donnees`() {
        val repo = InMemoryGameTypeRepository()
        val gt = GameType("gt1", "Belote", WinCondition.HIGHEST_SCORE)
        repo.save(gt)
        val found = repo.findById("gt1")
        assertNotNull(found)
        assertEquals("Belote", found.name)
    }

    @Test
    fun `MatchRepository findById via save upsert conserve les donnees`() {
        val repo = InMemoryMatchRepository()
        val match = Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)), emptyList())
        repo.save(match)
        val found = repo.findById("m1")
        assertNotNull(found)
        assertEquals(1000L, found.date)
    }

    @Test
    fun `saveAll players adds all in one operation`() {
        val repo = InMemoryPlayerRepository()
        val players = listOf(
            Player(id = "p1", name = "Alice"),
            Player(id = "p2", name = "Bob"),
        )
        repo.saveAll(players)
        assertEquals(2, repo.getAll(includeInactive = true).size)
    }

    @Test
    fun `saveAll players upserts existing`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player(id = "p1", name = "Alice"))
        repo.saveAll(listOf(Player(id = "p1", name = "Updated Alice")))
        assertEquals("Updated Alice", repo.getAll(includeInactive = true).first().name)
    }
}
