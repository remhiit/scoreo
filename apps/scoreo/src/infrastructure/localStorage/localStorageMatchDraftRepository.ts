import type { MatchDraft } from '../../domain/model/matchDraft'
import { MatchDraftSchema } from '../../domain/model/matchDraft.schema'
import type { MatchDraftRepository } from '../../domain/port/matchDraftRepository'

const KEY = 'scoreo_match_draft'

export class LocalStorageMatchDraftRepository implements MatchDraftRepository {
  save(draft: MatchDraft): void {
    localStorage.setItem(KEY, JSON.stringify(draft))
  }

  load(): MatchDraft | undefined {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return undefined
    try {
      return MatchDraftSchema.parse(JSON.parse(raw))
    } catch {
      return undefined
    }
  }

  clear(): void {
    localStorage.removeItem(KEY)
  }
}
