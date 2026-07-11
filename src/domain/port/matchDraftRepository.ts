import type { MatchDraft } from '../model/matchDraft'

export interface MatchDraftRepository {
  save(draft: MatchDraft): void
  load(): MatchDraft | undefined
  clear(): void
}
