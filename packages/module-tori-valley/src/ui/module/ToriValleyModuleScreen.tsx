import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import i18next from 'i18next'
import { useMemo, useState } from 'react'
import { registerTranslations } from '../../i18n'
// Bundled with this chunk, so the module arrives styled and costs the host
// nothing until someone opens it.
import '../../styles.css'
import type { ObjectifCardSelection } from '../../domain/model/landscape'
import {
  ToriValleyModuleDataSchema,
  toModuleMatchResult,
  type ToriValleyModuleData,
} from '../../domain/model/moduleResult'
import type { Player } from '../../domain/model/player'
import { MatchSetupScreen } from '../matchsetup/MatchSetupScreen'
import { buildInitialState } from '../scoredetail/scoreDetailReducer'
import { ScoreDetailScreen } from '../scoredetail/ScoreDetailScreen'
import type { ScoreDetailMode } from '../scoredetail/scoreDetailTypes'

/**
 * The module's strings join the host's i18next instance when this chunk loads,
 * under the module's own namespace. Doing it here rather than asking the host to
 * do it keeps Scoreo free of any knowledge of what a module translates — and
 * costs nothing until someone opens the module.
 */
registerTranslations(i18next)

/**
 * Torī Valley as the host runs it.
 *
 * Nothing here touches the module's own storage: the players come from the
 * host, the finished match goes back to the host, and `tori_valley_*` is left
 * untouched. The module keeps its two steps — deal the Objectif cards, then
 * enter the scores — because they are the game's, not the app's.
 */
export default function ToriValleyModuleScreen({
  host,
  playerIds,
  editing,
  onExit,
}: ScoringModuleScreenProps) {
  const restored = useMemo(() => (editing ? parseModuleData(editing.data) : undefined), [editing])

  // The scoring screen only ever reads id and name; `active` belongs to the
  // host's own roster and means nothing to a match in progress.
  const players: Player[] = useMemo(() => {
    const known = new Map(host.getPlayers().map((p) => [p.id, p.name]))
    return playerIds.map((id) => ({ id, name: known.get(id) ?? '', active: true }))
  }, [host, playerIds])

  const [objectifCards, setObjectifCards] = useState<ObjectifCardSelection | undefined>(undefined)

  if (players.length === 0) return null

  if (objectifCards === undefined) {
    return (
      <MatchSetupScreen
        playerIds={[...playerIds]}
        initialSelection={restored?.objectifCards}
        onConfirm={setObjectifCards}
        onCancel={onExit}
      />
    )
  }

  const mode: ScoreDetailMode =
    editing !== undefined ? { type: 'Edit', matchId: editing.matchId } : { type: 'Create' }

  return (
    <ScoreDetailScreen
      initialState={buildInitialState(players, mode, restored?.results ?? [], objectifCards)}
      save={(results, cards) => {
        host.saveMatch(
          toModuleMatchResult({
            playerIds: players.map((p) => p.id),
            objectifCards: cards,
            results,
            // Present only when reopening: that is what turns the save into an
            // update instead of a second match. No `playedAt` — the host's clock.
            matchId: editing?.matchId,
          }),
        )
      }}
      onSaved={onExit}
      onCancel={onExit}
    />
  )
}

/**
 * The host stores `moduleData` without ever reading it, so a payload written by
 * an older version of this module — or corrupted on the way — has to be checked
 * here. An unreadable one starts a fresh grid rather than crashing the screen.
 */
function parseModuleData(data: unknown): ToriValleyModuleData | undefined {
  const parsed = ToriValleyModuleDataSchema.safeParse(data)
  return parsed.success ? parsed.data : undefined
}
