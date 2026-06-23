package com.scoreo.application

import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atStartOfDayIn
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.encodeToString

fun migrateMatchesJson(
    rawJson: String,
    json: Json,
    generateId: () -> String,
): String? {
    val elements = try {
        json.parseToJsonElement(rawJson).jsonArray
    } catch (_: Exception) {
        return null
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
                mutable["id"] = JsonPrimitive(generateId())
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
    if (!changed) return null
    return json.encodeToString(JsonArray(migrated))
}

internal fun isUuid(str: String): Boolean =
    Regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", RegexOption.IGNORE_CASE).matches(str)
