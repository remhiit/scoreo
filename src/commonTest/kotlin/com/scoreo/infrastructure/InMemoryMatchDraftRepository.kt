package com.scoreo.infrastructure

import com.scoreo.domain.model.MatchDraft
import com.scoreo.domain.port.MatchDraftRepository

class InMemoryMatchDraftRepository : MatchDraftRepository {
    private var draft: MatchDraft? = null

    override fun save(draft: MatchDraft) {
        this.draft = draft
    }

    override fun load(): MatchDraft? = draft

    override fun clear() {
        draft = null
    }
}
