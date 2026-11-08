import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import { withModuleRules } from './withModuleRules'

/**
 * Decorates a `GameTypeRepository` so every game type it hands out carries the
 * rules of its module (`withModuleRules`). Writes go straight to the wrapped
 * repository. `SyncUseCase` is deliberately wired on the raw one: what the
 * Drive sync compares and uploads must not change with this read-time view.
 */
export class ModuleRulesGameTypeRepository implements GameTypeRepository {
  constructor(private readonly inner: GameTypeRepository) {}

  getAll(includeInactive?: boolean): GameType[] {
    return this.inner.getAll(includeInactive).map((gt) => withModuleRules(gt))
  }

  findById(id: string): GameType | undefined {
    const found = this.inner.findById(id)
    return found === undefined ? undefined : withModuleRules(found)
  }

  save(gameType: GameType): void {
    this.inner.save(gameType)
  }

  saveAll(gameTypes: GameType[]): void {
    this.inner.saveAll(gameTypes)
  }

  hardDelete(id: string): void {
    this.inner.hardDelete(id)
  }

  deleteAll(): void {
    this.inner.deleteAll()
  }
}
