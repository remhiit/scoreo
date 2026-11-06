import type { ModuleHost, ModuleMatch } from '@scoreboards/module-api'
import {
  assertMatchConsistent,
  type GameType,
  type Match,
  type Player,
} from '@scoreboards/shared-domain'
import { newId } from '../application/idGenerator'
import type { MatchDraftRepository } from '../domain/port/matchDraftRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { ModuleDraftRepository } from '../domain/port/moduleDraftRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'

/**
 * The host side of the module contract: everything a module is allowed to do to
 * Scoreo, and nothing more. A module never sees a repository.
 *
 * One adapter per match being scored — it is bound to the module and the game
 * type the screen was opened for.
 */
export class ModuleHostAdapter implements ModuleHost {
  constructor(
    private readonly moduleId: string,
    readonly gameType: GameType,
    private readonly playerIds: readonly string[],
    private readonly playerRepository: PlayerRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchDraftRepository: MatchDraftRepository,
    // Read-only fallback (and cleanup) for drafts written before the single
    // draft slot existed; removed with the contract phase (#611).
    private readonly moduleDraftRepository: ModuleDraftRepository,
    private readonly currentDate: () => number,
    // Host code to host code, never surfaced to the module: lets the screen
    // that owns this adapter know a match was written, for its own exit
    // decision. `saveMatch`'s return value already tells the *caller*; this
    // tells whoever built the adapter, without widening the module contract.
    private readonly onMatchSaved?: (matchId: string) => void,
  ) {}

  getPlayers(): readonly Player[] {
    // Retired players included: reopening an old match still needs their names.
    return this.playerRepository.getAll(true)
  }

  saveMatch(moduleMatch: ModuleMatch): string {
    // A match that contradicts itself or its game's rules is a scoring bug in
    // the module. Refusing it here keeps it out of the history, where nothing
    // would ever notice it again.
    assertMatchConsistent(moduleMatch, this.gameType)

    const existing =
      moduleMatch.id === undefined ? undefined : this.matchRepository.findById(moduleMatch.id)

    const match: Match = {
      id: moduleMatch.id ?? newId(),
      // Re-saving a match keeps the evening it was played, not the evening it
      // was corrected.
      date: moduleMatch.date ?? existing?.date ?? this.currentDate(),
      gameTypeId: this.gameType.id,
      playerScores: moduleMatch.playerScores.map((ps) => ({ ...ps })),
      manualWinners: [...moduleMatch.manualWinners],
      secondaryPlayerScores: [],
      rounds: moduleMatch.rounds.map((round) => round.map((ps) => ({ ...ps }))),
      // The module owns `version` and `data`; the host only stamps whose payload
      // it is, so a match can never be handed to the wrong module.
      moduleData:
        moduleMatch.moduleData === null
          ? null
          : {
              moduleId: this.moduleId,
              version: moduleMatch.moduleData.version,
              data: moduleMatch.moduleData.data,
            },
    }

    this.matchRepository.save(match)
    this.clearDraft()
    this.onMatchSaved?.(match.id)
    return match.id
  }

  loadDraft(): unknown | undefined {
    const draft = this.matchDraftRepository.load()
    if (
      draft?.moduleState != null &&
      draft.moduleState.moduleId === this.moduleId &&
      draft.gameTypeId === this.gameType.id
    ) {
      return draft.moduleState.state
    }
    return this.moduleDraftRepository.load(this.moduleId)
  }

  saveDraft(state: unknown): void {
    // One slot for every game: this replaces whatever draft was there.
    this.matchDraftRepository.save({
      gameTypeId: this.gameType.id,
      playerIds: [...this.playerIds],
      rounds: [],
      updatedAt: this.currentDate(),
      moduleState: { moduleId: this.moduleId, state },
    })
  }

  clearDraft(): void {
    if (this.matchDraftRepository.load()?.moduleState?.moduleId === this.moduleId) {
      this.matchDraftRepository.clear()
    }
    this.moduleDraftRepository.clear(this.moduleId)
  }
}
