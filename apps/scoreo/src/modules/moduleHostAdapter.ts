import {
  assertRoundsSumToRanking,
  type ModuleHost,
  type ModuleMatchResult,
  type ModulePlayer,
} from '@scoreboards/module-api'
import { newId } from '../application/idGenerator'
import { rankingToMatch } from '../application/rankingToMatch'
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
    private readonly gameTypeId: string,
    private readonly playerRepository: PlayerRepository,
    private readonly matchRepository: MatchRepository,
    private readonly moduleDraftRepository: ModuleDraftRepository,
    private readonly currentDate: () => number,
    // Host code to host code, never surfaced to the module: lets the screen
    // that owns this adapter know a match was written, for its own exit
    // decision. `saveMatch`'s return value already tells the *caller*; this
    // tells whoever built the adapter, without widening the module contract.
    private readonly onMatchSaved?: (matchId: string) => void,
  ) {}

  getPlayers(): readonly ModulePlayer[] {
    // Retired players included: reopening an old match still needs their names.
    return this.playerRepository.getAll(true).map((player) => ({
      id: player.id,
      name: player.name,
    }))
  }

  saveMatch(result: ModuleMatchResult): string {
    // Round detail that contradicts the announced scores is a scoring bug in the
    // module. Refusing it here keeps a self-contradicting match out of the
    // history, where nothing would ever notice it again.
    assertRoundsSumToRanking(result)

    const existing =
      result.matchId === undefined ? undefined : this.matchRepository.findById(result.matchId)

    const match = rankingToMatch({
      id: result.matchId ?? newId(),
      // Re-saving a match keeps the evening it was played, not the evening it
      // was corrected.
      date: result.playedAt ?? existing?.date ?? this.currentDate(),
      gameTypeId: this.gameTypeId,
      ranking: result.ranking,
      rounds: result.rounds?.map((round) =>
        round.scores.map((score) => ({ playerId: score.playerId, score: score.score })),
      ),
      // The module owns `version` and `data`; the host only stamps whose payload
      // it is, so a match can never be handed to the wrong module.
      moduleData:
        result.moduleData === undefined
          ? null
          : {
              moduleId: this.moduleId,
              version: result.moduleData.version,
              data: result.moduleData.data,
            },
    })

    this.matchRepository.save(match)
    this.moduleDraftRepository.clear(this.moduleId)
    this.onMatchSaved?.(match.id)
    return match.id
  }

  loadDraft(): unknown | undefined {
    return this.moduleDraftRepository.load(this.moduleId)
  }

  saveDraft(state: unknown): void {
    this.moduleDraftRepository.save(this.moduleId, state)
  }

  clearDraft(): void {
    this.moduleDraftRepository.clear(this.moduleId)
  }
}
