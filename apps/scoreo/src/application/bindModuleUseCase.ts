import type { ScoringModuleManifest } from '@scoreboards/module-api'
import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import { newId } from './idGenerator'

/**
 * Returns the `GameType` a module counts, binding the two on first use.
 *
 * Nothing is materialized when the app starts: a fresh profile shows no game
 * types at all. A module's game only becomes real the first time someone
 * chooses to play it, which is when this runs:
 *
 * 1. a game already carries this `moduleId` → reuse it;
 * 2. otherwise a game's name matches one the module claims → stamp the
 *    `moduleId` onto it, the common case for a history created by a v1.1 import;
 * 3. otherwise create the game now, from the manifest.
 *
 * Idempotent: rule 1 catches every call after the first.
 */
export class BindModuleUseCase {
  constructor(private readonly repository: GameTypeRepository) {}

  invoke(manifest: ScoringModuleManifest): GameType {
    // Archived games count: rebinding around one would create a duplicate of a
    // game the user only meant to hide.
    const all = this.repository.getAll(true)

    const bound = all.find((gt) => gt.moduleId === manifest.moduleId)
    if (bound) return this.reactivate(bound)

    // Every alias counts, not just the display name: a history imported from an
    // older export may carry a name the module has since stopped showing.
    const aliases = new Set(manifest.gameNames.map((n) => n.trim().toLowerCase()))
    const byName = all.find((gt) => aliases.has(gt.name.trim().toLowerCase()))
    if (byName) {
      const stamped: GameType = { ...byName, moduleId: manifest.moduleId, active: true }
      this.repository.save(stamped)
      return stamped
    }

    const created: GameType = {
      id: newId(),
      name: manifest.gameNames[0],
      winCondition: manifest.winCondition,
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: manifest.moduleId,
      active: true,
    }
    this.repository.save(created)
    return created
  }

  /** Playing a game un-archives it: the user is asking for it by name. */
  private reactivate(gameType: GameType): GameType {
    if (gameType.active) return gameType
    const revived: GameType = { ...gameType, active: true }
    this.repository.save(revived)
    return revived
  }
}
