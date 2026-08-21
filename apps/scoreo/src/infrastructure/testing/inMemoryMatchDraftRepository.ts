import type { MatchDraft } from '../../domain/model/matchDraft'
import type { MatchDraftRepository } from '../../domain/port/matchDraftRepository'

export class InMemoryMatchDraftRepository implements MatchDraftRepository {
  private draft: MatchDraft | undefined

  save(draft: MatchDraft): void {
    this.draft = draft
  }

  load(): MatchDraft | undefined {
    return this.draft
  }

  clear(): void {
    this.draft = undefined
  }
}
