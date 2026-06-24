package com.scoreo.domain.port

import com.scoreo.domain.model.MatchDraft

interface MatchDraftRepository {
    fun save(draft: MatchDraft)
    fun load(): MatchDraft?
    fun clear()
}
