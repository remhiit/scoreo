import type { ScoringModuleManifest } from '@scoreboards/module-api'
import { effectiveScoringMode, newGameType, type GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import { newId } from './idGenerator'
import { rescoreGameMatches } from './rescoreGameMatches'

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

/** The rules a module imposes on its game, as stored on the `GameType`. */
export type ModuleRules = Pick<
  GameType,
  'winCondition' | 'scoringMode' | 'minPlayers' | 'maxPlayers'
>

/** What aligning a bound game on its module changed. */
export interface RulesChange {
  before: ModuleRules
  after: ModuleRules
  /** Matches of the game rewritten by `rescoreMatch` (scores that changed). */
  rescoredMatches: number
  /**
   * True when the win condition or scoring mode changed on a game that has
   * matches: its history is now read under other rules. A change of the player
   * range alone, or on a game without history, is not.
   */
  affectsHistory: boolean
}

export interface BindResult {
  gameType: GameType
  /** Only set when the stored rules changed (never for rule 3, a game just created). */
  rulesChange?: RulesChange
}

/** The rules `manifest` imposes: its win condition, mode (default points) and range. */
export function manifestRules(manifest: ScoringModuleManifest): ModuleRules {
  return {
    winCondition: manifest.winCondition,
    scoringMode: effectiveScoringMode({
      winCondition: manifest.winCondition,
      scoringMode: manifest.scoringMode ?? 'POINTS',
      moduleId: manifest.moduleId,
    }),
    minPlayers: manifest.minPlayers,
    maxPlayers: manifest.maxPlayers,
  }
}

function sameRules(a: ModuleRules, b: ModuleRules): boolean {
  return (
    a.winCondition === b.winCondition &&
    a.scoringMode === b.scoringMode &&
    a.minPlayers === b.minPlayers &&
    a.maxPlayers === b.maxPlayers
  )
}

function rulesOf(gameType: GameType): ModuleRules {
  const { winCondition, scoringMode, minPlayers, maxPlayers } = gameType
  return { winCondition, scoringMode, minPlayers, maxPlayers }
}

/**
 * Returns the `GameType` a module counts, binding the two on first use and
 * aligning its rules on the module's on every use.
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
 * The module is the source of truth of its game's rules: for rules 1 and 2, the
 * game's `winCondition`, `scoringMode` and player range are set to the
 * manifest's. When the win condition or scoring mode changes, the game's matches
 * are rescored (`rescoreGameMatches`, written before the game type — same order
 * and non-atomicity as `UpdateGameTypeUseCase`) and the outcome is reported in
 * `rulesChange`. Already aligned (the usual case): nothing is written.
 *
 * Idempotent: rule 1 catches every call after the first. Rules 1 and 2 are
 * `resolveBindingTarget`, so a caller can preview the outcome without binding.
 */
export class BindModuleUseCase {
  constructor(
    private readonly repository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  invoke(manifest: ScoringModuleManifest): BindResult {
    // Archived games count: rebinding around one would create a duplicate of a
    // game the user only meant to hide.
    const all = this.repository.getAll(true)

    const target = resolveBindingTarget(manifest, all)
    if (target !== undefined) return this.align(target.gameType, manifest)

    const created = newGameType(newId(), manifest.gameNames[0], manifest.winCondition, {
      moduleId: manifest.moduleId,
      ...manifestRules(manifest),
    })
    this.repository.save(created)
    return { gameType: created }
  }

  /**
   * Binds (rule 2), un-archives (playing a game asks for it by name) and aligns
   * the rules, saving only when something differs.
   */
  private align(current: GameType, manifest: ScoringModuleManifest): BindResult {
    const before = rulesOf(current)
    const after = manifestRules(manifest)
    const updated: GameType = {
      ...current,
      ...after,
      moduleId: manifest.moduleId,
      active: true,
    }
    const unchanged =
      current.moduleId === updated.moduleId && current.active && sameRules(before, after)
    if (unchanged) return { gameType: current }

    const rescoredMatches = rescoreGameMatches(this.matchRepository, current, updated)
    this.repository.save(updated)

    if (sameRules(before, after)) return { gameType: updated }

    const computationChanged =
      before.winCondition !== after.winCondition || before.scoringMode !== after.scoringMode
    const hasMatches =
      computationChanged && this.matchRepository.getAll().some((m) => m.gameTypeId === current.id)
    return {
      gameType: updated,
      rulesChange: {
        before,
        after,
        rescoredMatches,
        affectsHistory: computationChanged && hasMatches,
      },
    }
  }
}
