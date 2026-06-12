package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject

data class SemanticVersion(val major: Int, val minor: Int) {
    companion object {
        fun parse(s: String): SemanticVersion {
            val parts = s.split(".")
            require(parts.size == 2) { "Invalid version format: $s (expected major.minor)" }
            return SemanticVersion(
                major = parts[0].toIntOrNull() ?: error("Invalid major version: $s"),
                minor = parts[1].toIntOrNull() ?: error("Invalid minor version: $s"),
            )
        }
    }
}

object ImportVersions {
    val CURRENT = SemanticVersion(1, 1)
}

data class ImportResult(
    val imported: Int = 0,
    val skipped: List<String> = emptyList(),
    val failed: List<String> = emptyList(),
)

data class ImportPreview(
    val gameName: String,
    val count: Int,
)

class ImportMatchesUseCase(
    private val playerRepository: PlayerRepository,
    private val gameTypeRepository: GameTypeRepository,
    private val matchRepository: MatchRepository,
    private val currentDate: () -> Long,
) {
    fun preview(jsonString: String): Result<ImportPreview> = runCatching {
        val root = parseRoot(jsonString)
        ImportPreview(gameName = root.game, count = root.games.size)
    }

    fun execute(jsonString: String): Result<ImportResult> = runCatching {
        val root = parseRoot(jsonString)
        val gameType = resolveGameType(root.game, root.winCondition)
        val existingPlayers = playerRepository.getAll().toMutableList()
        var imported = 0
        val skipped = mutableListOf<String>()
        val failed = mutableListOf<String>()

        for (game in root.games) {
            if (matchRepository.findById(game.id) != null) {
                skipped.add(game.id)
                continue
            }

            val playerIds = mutableListOf<String>()
            val scores = mutableListOf<PlayerScore>()
            val rankingMap = mutableMapOf<String, Int>()

            for (entry in game.ranking) {
                val player = resolvePlayer(entry.name, existingPlayers)
                playerIds.add(player.id)
                scores.add(PlayerScore(playerId = player.id, score = entry.score))
                rankingMap[player.id] = entry.rank
            }

            if (game.details != null) {
                var valid = true
                for (playerId in playerIds) {
                    val expected = scores.find { it.playerId == playerId }?.score ?: 0
                    val actual = game.details.sumOf { round ->
                        round.scores.find { it.name == playerName(playerId, existingPlayers) }?.score ?: 0
                    }
                    if (expected != actual) {
                        failed.add(game.id)
                        valid = false
                        break
                    }
                }
                if (!valid) continue
            }

            val manualWinners = scores
                .filter { rankingMap[it.playerId] == 1 }
                .map { it.playerId }

            val match = Match(
                id = game.id,
                date = game.date ?: currentDate(),
                gameTypeId = gameType.id,
                playerScores = scores,
                manualWinners = manualWinners,
            )
            matchRepository.save(match)
            imported++
        }

        ImportResult(imported = imported, skipped = skipped, failed = failed)
    }

    private fun parseRoot(jsonString: String): ImportRoot {
        val element = kotlinx.serialization.json.Json.parseToJsonElement(jsonString).jsonObject
        val rawVersion = (element["version"] as? JsonPrimitive)?.content
            ?: error("Missing 'version' field")
        val version = SemanticVersion.parse(rawVersion)
        return when (version.major) {
            1 -> parseV1(element, version)
            else -> error("Unsupported version $rawVersion, expected ${ImportVersions.CURRENT.major}.x")
        }
    }

    private fun parseV1(element: JsonObject, version: SemanticVersion): ImportRoot {
        val game = (element["game"] as? JsonPrimitive)?.content
            ?: error("Missing 'game' field")
        val games = (element["games"] as? JsonArray)
            ?: error("Missing 'games' array")
        if (games.isEmpty()) error("'games' array is empty")
        val winCondition = (element["winCondition"] as? JsonPrimitive)?.content
        return ImportRoot(
            game = game,
            games = games.map { parseGame(it) },
            version = version,
            winCondition = winCondition,
        )
    }

    private fun parseGame(element: JsonElement): ImportGame {
        val obj = element.jsonObject
        val id = (obj["id"] as? JsonPrimitive)?.content ?: error("Missing game 'id'")
        val date = (obj["date"] as? JsonPrimitive)?.let { it.content.toLongOrNull() }
        val ranking = (obj["ranking"] as? JsonArray) ?: error("Missing 'ranking' in game $id")
        if (ranking.size < 2) error("'ranking' must have at least 2 entries in game $id")
        val details = (obj["details"] as? JsonArray)?.map { parseRound(it) }
        return ImportGame(
            id = id,
            date = date,
            ranking = ranking.map { parseRankingEntry(it) },
            details = details,
        )
    }

    private fun parseRankingEntry(element: JsonElement): ImportRankingEntry {
        val obj = element.jsonObject
        val name = (obj["name"] as? JsonPrimitive)?.content ?: error("Missing 'name' in ranking")
        val score = (obj["score"] as? JsonPrimitive)?.let { it.content.toIntOrNull() }
            ?: error("Invalid 'score' in ranking for $name")
        val rank = (obj["rank"] as? JsonPrimitive)?.let { it.content.toIntOrNull() }
            ?: error("Invalid 'rank' in ranking for $name")
        return ImportRankingEntry(name = name, score = score, rank = rank)
    }

    private fun parseRound(element: JsonElement): ImportRound {
        val obj = element.jsonObject
        val scores = (obj["scores"] as? JsonArray) ?: error("Missing 'scores' in round")
        return ImportRound(
            scores = scores.map { parseRoundScore(it) },
        )
    }

    private fun parseRoundScore(element: JsonElement): ImportRoundScore {
        val obj = element.jsonObject
        val name = (obj["name"] as? JsonPrimitive)?.content ?: error("Missing 'name' in round score")
        val score = (obj["score"] as? JsonPrimitive)?.let { it.content.toIntOrNull() }
            ?: error("Invalid 'score' in round for $name")
        return ImportRoundScore(name = name, score = score)
    }

    private fun resolveGameType(name: String, winCondition: String? = null): GameType {
        val existing = gameTypeRepository.getAll().find { it.name.equals(name, ignoreCase = true) }
        if (existing != null) return existing
        val wc = winCondition?.let { wcStr ->
            WinCondition.entries.find { it.name.equals(wcStr, ignoreCase = true) }
                ?: error("Unknown winCondition '$wcStr'. Valid values: ${WinCondition.entries.joinToString { it.name }}")
        } ?: WinCondition.MANUAL
        val gameType = GameType(id = IdGenerator.newId(), name = name, winCondition = wc)
        gameTypeRepository.save(gameType)
        return gameType
    }

    private fun resolvePlayer(name: String, existingPlayers: MutableList<Player>): Player {
        val existing = existingPlayers.find { it.name.equals(name, ignoreCase = true) }
        if (existing != null) return existing
        val player = Player(id = IdGenerator.newId(), name = name)
        existingPlayers.add(player)
        playerRepository.save(player)
        return player
    }

    private fun playerName(playerId: String, players: List<Player>): String =
        players.find { it.id == playerId }?.name ?: playerId
}

private data class ImportRoot(
    val version: SemanticVersion,
    val game: String,
    val games: List<ImportGame>,
    val winCondition: String? = null,
)

private data class ImportGame(
    val id: String,
    val date: Long?,
    val ranking: List<ImportRankingEntry>,
    val details: List<ImportRound>?,
)

private data class ImportRankingEntry(
    val name: String,
    val score: Int,
    val rank: Int,
)

private data class ImportRound(
    val scores: List<ImportRoundScore>,
)

private data class ImportRoundScore(
    val name: String,
    val score: Int,
)
