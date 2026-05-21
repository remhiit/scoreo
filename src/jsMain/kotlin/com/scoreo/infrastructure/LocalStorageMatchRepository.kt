package com.scoreo.infrastructure

import com.scoreo.domain.model.Match
import com.scoreo.domain.port.MatchRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val KEY = "scoreo_matches"

class LocalStorageMatchRepository : MatchRepository {
    private val json = Json { ignoreUnknownKeys = true }

    override fun getAll(): List<Match> =
        localStorage.getItem(KEY)
            ?.let { json.decodeFromString<List<Match>>(it) }
            ?: emptyList()

    override fun save(match: Match) {
        val updated = getAll().toMutableList().also { it.add(match) }
        localStorage.setItem(KEY, json.encodeToString(updated))
    }
}
