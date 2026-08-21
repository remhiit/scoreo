import type { Player } from '../domain/model/player'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'

export class CleanupInactivePlayersUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  preview(): Player[] {
    const referencedIds = this.referencedPlayerIds()
    return this.playerRepository.getAll(true).filter((p) => !p.active && !referencedIds.has(p.id))
  }

  execute(): Player[] {
    const eligible = this.preview()
    for (const player of eligible) {
      this.playerRepository.hardDelete(player.id)
    }
    return eligible
  }

  private referencedPlayerIds(): Set<string> {
    const ids = new Set<string>()
    for (const match of this.matchRepository.getAll()) {
      for (const score of match.playerScores) ids.add(score.playerId)
      for (const score of match.secondaryPlayerScores) ids.add(score.playerId)
    }
    return ids
  }
}
