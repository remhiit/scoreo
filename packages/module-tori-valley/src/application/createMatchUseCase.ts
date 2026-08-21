import { ValidationError } from '../domain/model/errors'
import { defaultObjectifCardSelection, type ObjectifCardSelection } from '../domain/model/landscape'
import type { Match, PlayerResult } from '../domain/model/match'
import type { MatchRepository } from '../domain/port/matchRepository'
import { newId } from './idGenerator'

const MIN_PLAYERS = 1
const MAX_PLAYERS = 4

function validatePlayersAndResults(playerIds: string[], results: PlayerResult[]): void {
  if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
    throw new ValidationError(
      'playerIds',
      `A match needs between ${MIN_PLAYERS} and ${MAX_PLAYERS} players`,
      'errors.match.playerCount',
      { min: MIN_PLAYERS, max: MAX_PLAYERS },
    )
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new ValidationError(
      'playerIds',
      'Duplicate player ids in match',
      'errors.match.duplicatePlayers',
    )
  }
  const resultPlayerIds = results.map((r) => r.playerId)
  if (
    new Set(resultPlayerIds).size !== resultPlayerIds.length ||
    resultPlayerIds.length !== playerIds.length
  ) {
    throw new ValidationError(
      'results',
      'There must be exactly one result per player',
      'errors.match.resultsCount',
    )
  }
  if (!playerIds.every((id) => resultPlayerIds.includes(id))) {
    throw new ValidationError(
      'results',
      'Results must cover every player in the match',
      'errors.match.resultsCoverage',
    )
  }
}

export class CreateMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  invoke(
    playerIds: string[],
    results: PlayerResult[],
    playedAt: number,
    objectifCards: ObjectifCardSelection = defaultObjectifCardSelection(),
  ): Match {
    validatePlayersAndResults(playerIds, results)
    const match: Match = { id: newId(), playedAt, playerIds, results, objectifCards }
    this.matchRepository.save(match)
    return match
  }
}
