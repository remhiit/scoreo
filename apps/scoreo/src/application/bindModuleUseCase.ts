import type { ScoringModuleManifest } from '@scoreboards/module-api'
import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import { newId } from './idGenerator'

/**
 * How game names are compared when matching a game type to a module:
 * case-insensitive, ignoring surrounding blanks.
 */
export function normalizeGameName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Whether `name` is one of the names the module claims. Every alias counts, not
 * just the display name: a history imported from an older export may carry a
 * name the module has since stopped showing.
 */
export function manifestClaimsGameName(manifest: ScoringModuleManifest, name: string): boolean {
  const normalized = normalizeGameName(name)
  return manifest.gameNames.some((n) => normalizeGameName(n) === normalized)
}

/** The existing game type `BindModuleUseCase` would bind a module to, and by which rule. */
export type BindingTarget =
  { kind: 'bound'; gameType: GameType } | { kind: 'byName'; gameType: GameType }

/**
 * Rules 1 and 2 of `BindModuleUseCase`, without writing anything: the game type
 * binding `manifest` would land on, or `undefined` when it would create one
 * (rule 3). `allGameTypes` must be `GameTypeRepository.getAll(true)` — archived
 * games included, in repository order, since rule 2 takes the *first* match.
 *
 * Shared so a caller can tell in advance which game a binding will pick (the
 * game selection modal only offers a module on the game type it resolves to).
 */
export function resolveBindingTarget(
  manifest: ScoringModuleManifest,
  allGameTypes: readonly GameType[],
): BindingTarget | undefined {
  const bound = allGameTypes.find((gt) => gt.moduleId === manifest.moduleId)
  if (bound) return { kind: 'bound', gameType: bound }

  const byName = allGameTypes.find((gt) => manifestClaimsGameName(manifest, gt.name))
  if (byName) return { kind: 'byName', gameType: byName }

  return undefined
}

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
 * Idempotent: rule 1 catches every call after the first. Rules 1 and 2 are
 * `resolveBindingTarget`, so a caller can preview the outcome without binding.
 */
export class BindModuleUseCase {
  constructor(private readonly repository: GameTypeRepository) {}

  invoke(manifest: ScoringModuleManifest): GameType {
    // Archived games count: rebinding around one would create a duplicate of a
    // game the user only meant to hide.
    const all = this.repository.getAll(true)

    const target = resolveBindingTarget(manifest, all)
    if (target?.kind === 'bound') return this.reactivate(target.gameType)
    if (target?.kind === 'byName') {
      const stamped: GameType = { ...target.gameType, moduleId: manifest.moduleId, active: true }
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
