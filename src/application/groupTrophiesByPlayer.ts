import type { Trophy, TrophyHolder } from '../domain/model/trophy'

/**
 * Trophy ids in badge display order: permanent records first (A1, A4, B2,
 * B3, C1, C3, D1, E1), then rotating trophies (A2's current streak, F2's
 * player of the month).
 */
export const TROPHY_BADGE_ORDER = ['a1', 'a4', 'b2', 'b3', 'c1', 'c3', 'd1', 'e1', 'a2', 'f2']

export interface PlayerTrophyBadge {
  trophy: Trophy
  holder: TrophyHolder
}

/**
 * Inverts trophies (id -> holders) into badges (playerId -> trophies held),
 * ordered by `TROPHY_BADGE_ORDER`. A player ex aequo on a trophy gets the
 * badge the same as a sole holder. A player holding the same trophy id more
 * than once (e.g. D1's per-game-type record) gets one badge per holder
 * entry, each carrying its own value.
 */
export function groupTrophiesByPlayer(trophies: Trophy[]): Map<string, PlayerTrophyBadge[]> {
  const byId = new Map(trophies.map((trophy) => [trophy.id, trophy]))
  const result = new Map<string, PlayerTrophyBadge[]>()

  for (const id of TROPHY_BADGE_ORDER) {
    const trophy = byId.get(id)
    if (!trophy) continue
    for (const holder of trophy.holders) {
      const badge: PlayerTrophyBadge = { trophy, holder }
      const badges = result.get(holder.playerId)
      if (badges) badges.push(badge)
      else result.set(holder.playerId, [badge])
    }
  }

  return result
}
