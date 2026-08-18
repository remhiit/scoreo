import { NotFoundError, ValidationError } from '../domain/model/errors'
import type { ObjectifCardSelection } from '../domain/model/landscape'
import type { Match, PlayerResult } from '../domain/model/match'
import type { MatchRepository } from '../domain/port/matchRepository'

export class UpdateMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  /** `objectifCards` left out keeps whatever the match was recorded with. */
  invoke(matchId: string, results: PlayerResult[], objectifCards?: ObjectifCardSelection): Match {
    const existing = this.matchRepository.findById(matchId)
    if (!existing) throw new NotFoundError('Match', matchId, 'errors.notFound.match')

    const resultPlayerIds = results.map((r) => r.playerId)
    if (
      new Set(resultPlayerIds).size !== resultPlayerIds.length ||
      resultPlayerIds.length !== existing.playerIds.length
    ) {
      throw new ValidationError(
        'results',
        'There must be exactly one result per player',
        'errors.match.resultsCount',
      )
    }
    if (!existing.playerIds.every((id) => resultPlayerIds.includes(id))) {
      throw new ValidationError(
        'results',
        'Results must cover every player in the match',
        'errors.match.resultsCoverage',
      )
    }

    const updated: Match = {
      ...existing,
      results,
      objectifCards: objectifCards ?? existing.objectifCards,
    }
    this.matchRepository.save(updated)
    return updated
  }
}
