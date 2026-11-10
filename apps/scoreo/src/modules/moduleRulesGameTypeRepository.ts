import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import { withModuleRules } from './withModuleRules'

/**
 * Decorates a `GameTypeRepository` so every game type it hands out carries the
 * rules of its module (`withModuleRules`). `SyncUseCase` is deliberately wired
 * on the raw one: what the Drive sync compares and uploads must not change with
 * this read-time view.
 *
 * Writes keep the rules the game had stored: re-saving a game bound to a
 * registered module (renaming, archiving, binding a homonym) writes its other
 * fields but leaves its stored `winCondition`, `scoringMode`, `tieBreakRule`
 * and player range untouched, so the resolved view never overwrites the user's
 * original rules, which come back if the module is unbound or unregistered.
 * A game not stored yet, or not bound to a registered module, is written as is.
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
    this.inner.save(this.keepStoredRules(gameType))
  }

  saveAll(gameTypes: GameType[]): void {
    this.inner.saveAll(gameTypes.map((gt) => this.keepStoredRules(gt)))
  }

  hardDelete(id: string): void {
    this.inner.hardDelete(id)
  }

  deleteAll(): void {
    this.inner.deleteAll()
  }

  private keepStoredRules(gameType: GameType): GameType {
    if (withModuleRules(gameType) === gameType) return gameType
    const stored = this.inner.findById(gameType.id)
    if (stored === undefined) return gameType
    // The fields `withModuleRules` overrides with the manifest.
    return {
      ...gameType,
      winCondition: stored.winCondition,
      scoringMode: stored.scoringMode,
      tieBreakRule: stored.tieBreakRule,
      minPlayers: stored.minPlayers,
      maxPlayers: stored.maxPlayers,
    }
  }
}
