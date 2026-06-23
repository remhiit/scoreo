package com.scoreo.infrastructure

import com.scoreo.application.IdGenerator
import com.scoreo.application.migrateMatchesJson
import com.scoreo.domain.model.Match
import com.scoreo.domain.port.MatchRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString

private const val KEY = "scoreo_matches"

class LocalStorageMatchRepository : MatchRepository {
    private var migrated = false

    override fun getAll(): List<Match> {
        if (!migrated) {
            migrateIfNeeded()
            migrated = true
        }
        return localStorage.getItem(KEY)
            ?.let { runCatching { scoreoJson.decodeFromString<List<Match>>(it) }.getOrDefault(emptyList()) }
            ?: emptyList()
    }

    override fun save(match: Match) {
        val updated = getAll().toMutableList()
        val idx = updated.indexOfFirst { it.id == match.id }
        if (idx >= 0) updated[idx] = match else updated.add(match)
        localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
    }

    override fun findById(id: String): Match? = getAll().find { it.id == id }

    private fun migrateIfNeeded() {
        val raw = localStorage.getItem(KEY) ?: return
        val migrated = migrateMatchesJson(raw, scoreoJson) { IdGenerator.newId() } ?: return
        localStorage.setItem(KEY, migrated)
    }
}
