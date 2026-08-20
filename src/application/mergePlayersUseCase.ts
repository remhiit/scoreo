import { NotFoundError, ValidationError } from '../domain/model/errors'
import type { Match } from '../domain/model/match'
import type { PlayerScore } from '../domain/model/playerScore'
import type { MatchDraftRepository } from '../domain/port/matchDraftRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'

export interface MergePlayersPreview {
  /** Matches referencing the duplicate — how many would be rewritten. */
  affectedMatches: number
  /**
   * Matches referencing both players. Merging those would make the kept player
   * face themselves, so a non-zero count blocks the merge entirely.
   */
  conflictingMatches: number
}

/** Every place a match can name a player: scores, tie-break scores, per-round scores, manual winners. */
function referencesPlayer(match: Match, playerId: string): boolean {
  return (
    match.playerScores.some((s) => s.playerId === playerId) ||
    match.secondaryPlayerScores.some((s) => s.playerId === playerId) ||
    match.rounds.some((round) => round.some((s) => s.playerId === playerId)) ||
    match.manualWinners.includes(playerId)
  )
}

function remapScores(scores: PlayerScore[], sourceId: string, targetId: string): PlayerScore[] {
  return scores.map((s) => (s.playerId === sourceId ? { ...s, playerId: targetId } : s))
}

/**
 * Folds a duplicate player into the one to keep: every match reference moves to
 * the kept player, then the duplicate is hard-deleted. Renaming can't do this —
 * matches point at the player id, not the name — which is what makes an import
 * that spelled the same person twice ("Jean-Luc" / "Jean Luc") split their
 * stats, ELO and trophies in two.
 */
export class MergePlayersUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchDraftRepository: MatchDraftRepository,
  ) {}

  preview(sourceId: string, targetId: string): MergePlayersPreview {
    if (sourceId === targetId) return { affectedMatches: 0, conflictingMatches: 0 }

    let affectedMatches = 0
    let conflictingMatches = 0
    for (const match of this.matchRepository.getAll()) {
      if (!referencesPlayer(match, sourceId)) continue
      affectedMatches++
      if (referencesPlayer(match, targetId)) conflictingMatches++
    }
    return { affectedMatches, conflictingMatches }
  }

  invoke(sourceId: string, targetId: string): void {
    const players = this.playerRepository.getAll(true)
    const source = players.find((p) => p.id === sourceId)
    if (!source) throw new NotFoundError('Player', sourceId)
    const target = players.find((p) => p.id === targetId)
    if (!target) throw new NotFoundError('Player', targetId)
    if (sourceId === targetId) {
      throw new ValidationError('playerId', 'A player cannot be merged into themselves')
    }

    const { conflictingMatches } = this.preview(sourceId, targetId)
    if (conflictingMatches > 0) {
      throw new ValidationError(
        'playerId',
        `${conflictingMatches} match(es) involve both players, merging them would make one face themselves`,
      )
    }

    const rewritten = this.matchRepository
      .getAll()
      .filter((match) => referencesPlayer(match, sourceId))
      .map((match) => ({
        ...match,
        playerScores: remapScores(match.playerScores, sourceId, targetId),
        secondaryPlayerScores: remapScores(match.secondaryPlayerScores, sourceId, targetId),
        rounds: match.rounds.map((round) => remapScores(round, sourceId, targetId)),
        // No dedupe needed: a match naming the target too is a conflict, refused above.
        manualWinners: match.manualWinners.map((id) => (id === sourceId ? targetId : id)),
      }))
    // One saveAll rather than one save per match: a single change notification,
    // hence a single debounced auto-sync push.
    if (rewritten.length > 0) this.matchRepository.saveAll(rewritten)

    // A draft naming the duplicate would keep an id nothing resolves to.
    const draft = this.matchDraftRepository.load()
    if (draft?.playerIds.includes(sourceId)) this.matchDraftRepository.clear()

    // The kept player inherits the duplicate's activity: folding an active
    // duplicate into a soft-deleted target would otherwise hide the result.
    if (source.active && !target.active) this.playerRepository.save({ ...target, active: true })

    this.playerRepository.hardDelete(sourceId)
  }
}
