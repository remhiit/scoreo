package com.scoreo.infrastructure.fake

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.MatchDraft
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.PlayerRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.MatchDraftRepository
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString

class FakeLocalStorage {
    private val data = mutableMapOf<String, String>()
    
    fun getItem(key: String): String? = data[key]
    fun setItem(key: String, value: String) { data[key] = value }
    fun removeItem(key: String) { data.remove(key) }
}

class LocalStorageGameTypeRepository(private val storage: FakeLocalStorage) : GameTypeRepository {
    private val json = Json { ignoreUnknownKeys = true }
    private val KEY = "scoreo_gametypes"
    
    override fun getAll(includeInactive: Boolean): List<GameType> {
        val json_str = storage.getItem(KEY) ?: return emptyList()
        val all: List<GameType> = json.decodeFromString(json_str)
        return if (includeInactive) all else all.filter { it.active }
    }
    
    override fun save(gameType: GameType) {
        val all = getAll(includeInactive = true).toMutableList()
        all.removeIf { it.id == gameType.id }
        all.add(gameType)
        storage.setItem(KEY, json.encodeToString(all))
    }
    
    override fun saveAll(gameTypes: List<GameType>) {
        storage.setItem(KEY, json.encodeToString(gameTypes))
    }
    
    override fun findById(id: String): GameType? {
        return getAll(includeInactive = true).find { it.id == id }
    }
}

class LocalStoragePlayerRepository(private val storage: FakeLocalStorage) : PlayerRepository {
    private val json = Json { ignoreUnknownKeys = true }
    private val KEY = "scoreo_players"
    
    override fun getAll(includeInactive: Boolean): List<Player> {
        val json_str = storage.getItem(KEY) ?: return emptyList()
        val all: List<Player> = json.decodeFromString(json_str)
        return if (includeInactive) all else all.filter { it.active }
    }
    
    override fun save(player: Player) {
        val all = getAll(includeInactive = true).toMutableList()
        all.removeIf { it.id == player.id }
        all.add(player)
        storage.setItem(KEY, json.encodeToString(all))
    }
    
    override fun saveAll(players: List<Player>) {
        storage.setItem(KEY, json.encodeToString(players))
    }
    
    override fun delete(id: String, anonymize: Boolean) {
        val all = getAll(includeInactive = true).toMutableList()
        val player = all.find { it.id == id }
        if (player != null) {
            all.remove(player)
            all.add(player.copy(active = false, name = if (anonymize) "" else player.name))
            storage.setItem(KEY, json.encodeToString(all))
        }
    }
}

class LocalStorageMatchRepository(private val storage: FakeLocalStorage) : MatchRepository {
    private val json = Json { ignoreUnknownKeys = true }
    private val KEY = "scoreo_matches"
    
    override fun getAll(): List<Match> {
        val json_str = storage.getItem(KEY) ?: return emptyList()
        return json.decodeFromString(json_str)
    }
    
    override fun save(match: Match) {
        val all = getAll().toMutableList()
        all.removeIf { it.id == match.id }
        all.add(match)
        storage.setItem(KEY, json.encodeToString(all))
    }
    
    override fun saveAll(matches: List<Match>) {
        storage.setItem(KEY, json.encodeToString(matches))
    }
    
    override fun findById(id: String): Match? {
        return getAll().find { it.id == id }
    }
    
    override fun delete(id: String) {
        val all = getAll().toMutableList()
        all.removeIf { it.id == id }
        storage.setItem(KEY, json.encodeToString(all))
    }
}

class LocalStorageMatchDraftRepository(private val storage: FakeLocalStorage) : MatchDraftRepository {
    private val json = Json { ignoreUnknownKeys = true }
    private val KEY = "scoreo_match_draft"
    
    override fun save(draft: MatchDraft) {
        storage.setItem(KEY, json.encodeToString(draft))
    }
    
    override fun load(): MatchDraft? {
        val json_str = storage.getItem(KEY) ?: return null
        return json.decodeFromString(json_str)
    }
    
    override fun clear() {
        storage.removeItem(KEY)
    }
}
