package com.scoreo.infrastructure

import com.scoreo.domain.model.MatchDraft
import com.scoreo.domain.port.MatchDraftRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString

private const val KEY = "scoreo_match_draft"

class LocalStorageMatchDraftRepository : MatchDraftRepository {
    override fun save(draft: MatchDraft) {
        localStorage.setItem(KEY, scoreoJson.encodeToString(draft))
    }

    override fun load(): MatchDraft? {
        val raw = localStorage.getItem(KEY) ?: return null
        return try {
            scoreoJson.decodeFromString<MatchDraft>(raw)
        } catch (e: Exception) {
            null // Graceful fallback on deserialization error
        }
    }

    override fun clear() {
        localStorage.removeItem(KEY)
    }
}
