import { roundScoringChanged, type GameType } from '../domain/model/gameType'
import { rescoreMatch } from '../domain/model/match'
import type { MatchRepository } from '../domain/port/matchRepository'

/**
 * When `previous` → `updated` changes how rounds turn into a final score
 * (`roundScoringChanged`), rescores every match of the game (`rescoreMatch`) and
 * writes the ones that changed. Returns how many were written.
 *
 * Callers write the game type *after* this: if the write here fails (storage
 * quota), the game keeps its former rules, matching its matches. Shared by
 * `UpdateGameTypeUseCase` (the user edits the rules) and `BindModuleUseCase`
 * (the module's rules are imposed).
 */
export function rescoreGameMatches(
  matchRepository: MatchRepository,
  previous: GameType,
  updated: GameType,
): number {
  if (!roundScoringChanged(previous, updated)) return 0
  const recomputed = []
  for (const match of matchRepository.getAll()) {
    if (match.gameTypeId !== updated.id) continue
    const rescored = rescoreMatch(match, previous, updated)
    if (rescored !== match) recomputed.push(rescored)
  }
  if (recomputed.length > 0) matchRepository.saveAll(recomputed)
  return recomputed.length
}
