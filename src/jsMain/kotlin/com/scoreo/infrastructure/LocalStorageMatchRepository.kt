package com.scoreo.infrastructure

import com.scoreo.application.IdGenerator
import com.scoreo.domain.model.Match
import com.scoreo.domain.port.MatchRepository
import kotlinx.browser.localStorage
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atStartOfDayIn
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private const val KEY = "scoreo_matches"

class LocalStorageMatchRepository : MatchRepository {
    override fun getAll(): List<Match> {
        migrateIfNeeded()
        return localStorage.getItem(KEY)
            ?.let { scoreoJson.decodeFromString<List<Match>>(it) }
            ?: emptyList()
    }

    override fun save(match: Match) {
        val updated = getAll().toMutableList().also { it.add(match) }
        localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
    }

    override fun findById(id: String): Match? = getAll().find { it.id == id }

    private fun migrateIfNeeded() {
        val raw = localStorage.getItem(KEY) ?: return
        val elements = try {
            scoreoJson.parseToJsonElement(raw).jsonArray
        } catch (_: Exception) {
            return
        }
        var changed = false
        val migrated = elements.map { element ->
            val obj = element.jsonObject
            val mutable = obj.toMutableMap()
            var objChanged = false

            val dateEl = obj["date"]
            if (dateEl is JsonPrimitive && dateEl.isString) {
                val dateStr = dateEl.content
                try {
                    val localDate = LocalDate.parse(dateStr)
                    val epochMs = localDate.atStartOfDayIn(TimeZone.UTC).toEpochMilliseconds()
                    mutable["date"] = JsonPrimitive(epochMs)
                    objChanged = true
                } catch (_: Exception) {}
            }

            val idEl = obj["id"]
            if (idEl is JsonPrimitive && idEl.isString) {
                val idStr = idEl.content
                if (!isUuid(idStr)) {
                    mutable["id"] = JsonPrimitive(IdGenerator.newId())
                    objChanged = true
                }
            }

            if (objChanged) {
                changed = true
                JsonObject(mutable)
            } else {
                element
            }
        }
        if (changed) {
            localStorage.setItem(KEY, scoreoJson.encodeToString(JsonArray(migrated)))
        }
    }

    private fun isUuid(str: String): Boolean =
        Regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}").matches(str)
}
