import { NotFoundError, ValidationError } from '../domain/model/errors'
import type { Match } from '../domain/model/match'
import type { PlayerScore } from '../domain/model/playerScore'
import type { MatchDraftRepository } from '../domain/port/matchDraftRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'

export interface MergePlayersPreview {
  /** Matches referencing at least one duplicate — how many would be rewritten. */
  affectedMatches: number
  /**
   * Matches referencing two or more members of the merge group (the kept player
   * and the duplicates). Merging those would make the kept player face
   * themselves, so a non-zero count blocks the merge entirely.
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

function countMembersInMatch(match: Match, group: readonly string[]): number {
  return group.filter((playerId) => referencesPlayer(match, playerId)).length
}

function remapScores(scores: PlayerScore[], duplicates: ReadonlySet<string>, keptId: string): PlayerScore[] {
  return scores.map((s) => (duplicates.has(s.playerId) ? { ...s, playerId: keptId } : s))
}

/**
 * Folds one or more duplicate players into the one to keep: every match
 * reference moves to the kept player, then each duplicate is hard-deleted.
 * Renaming can't do this — matches point at the player id, not the name — which
 * is what makes an import that spelled the same person several ways ("Jean-Luc"
 * / "Jean Luc" / "JeanLuc") split their stats, ELO and trophies apart.
 */
export class MergePlayersUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchDraftRepository: MatchDraftRepository,
  ) {}

  preview(keptId: string, duplicateIds: readonly string[]): MergePlayersPreview {
    const duplicates = this.normalizeDuplicates(keptId, duplicateIds)
    if (duplicates.size === 0) return { affectedMatches: 0, conflictingMatches: 0 }

    const group = [keptId, ...duplicates]
    let affectedMatches = 0
    let conflictingMatches = 0
    for (const match of this.matchRepository.getAll()) {
      if (![...duplicates].some((id) => referencesPlayer(match, id))) continue
      affectedMatches++
      if (countMembersInMatch(match, group) > 1) conflictingMatches++
    }
    return { affectedMatches, conflictingMatches }
  }

  invoke(keptId: string, duplicateIds: readonly string[]): void {
    const players = this.playerRepository.getAll(true)
    const kept = players.find((p) => p.id === keptId)
    if (!kept) throw new NotFoundError('Player', keptId)

    const duplicates = new Set(duplicateIds)
    if (duplicates.has(keptId)) {
      throw new ValidationError('playerId', 'A player cannot be merged into themselves')
    }
    if (duplicates.size === 0) {
      throw new ValidationError('playerId', 'Select at least one duplicate to merge')
    }
    const merged = [...duplicates].map((id) => {
      const player = players.find((p) => p.id === id)
      if (!player) throw new NotFoundError('Player', id)
      return player
    })

    const { conflictingMatches } = this.preview(keptId, [...duplicates])
    if (conflictingMatches > 0) {
      throw new ValidationError(
        'playerId',
        `${conflictingMatches} match(es) involve two of the selected players, merging them would make one face themselves`,
      )
    }

    const rewritten = this.matchRepository
      .getAll()
      .filter((match) => [...duplicates].some((id) => referencesPlayer(match, id)))
      .map((match) => ({
        ...match,
        playerScores: remapScores(match.playerScores, duplicates, keptId),
        secondaryPlayerScores: remapScores(match.secondaryPlayerScores, duplicates, keptId),
        rounds: match.rounds.map((round) => remapScores(round, duplicates, keptId)),
        // No dedupe needed: a match naming two group members is a conflict, refused above.
        manualWinners: match.manualWinners.map((id) => (duplicates.has(id) ? keptId : id)),
      }))
    // One saveAll rather than one save per match: a single change notification,
    // hence a single debounced auto-sync push.
    if (rewritten.length > 0) this.matchRepository.saveAll(rewritten)

    // A draft naming a duplicate would keep an id nothing resolves to.
    const draft = this.matchDraftRepository.load()
    if (draft?.playerIds.some((id) => duplicates.has(id))) this.matchDraftRepository.clear()

    // The kept player inherits the duplicates' activity: folding an active
    // duplicate into a soft-deleted target would otherwise hide the result.
    if (!kept.active && merged.some((p) => p.active)) {
      this.playerRepository.save({ ...kept, active: true })
    }

    for (const duplicate of merged) this.playerRepository.hardDelete(duplicate.id)
  }

  /** Drops repeats and the kept player itself, so `preview` stays a pure read whatever the UI passes. */
  private normalizeDuplicates(keptId: string, duplicateIds: readonly string[]): Set<string> {
    const duplicates = new Set(duplicateIds)
    duplicates.delete(keptId)
    return duplicates
  }
}
