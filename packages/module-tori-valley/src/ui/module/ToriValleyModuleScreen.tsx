import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import i18next from 'i18next'
import { useMemo, useState, type ReactNode } from 'react'
import { registerTranslations } from '../../i18n'
// Bundled with this chunk, so the module arrives styled and costs the host
// nothing until someone opens it.
import '../../styles.css'
import type { ObjectifCardSelection } from '../../domain/model/landscape'
import {
  readDraft,
  toDraft,
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
  // Reopening a match wins over the draft: the host asked for *that* game.
  // Read once, on mount — `host.loadDraft()` is not meant to be polled.
  const [draft] = useState<ToriValleyModuleData | undefined>(() =>
    editing === undefined ? readDraft(host.loadDraft(), playerIds) : undefined,
  )

  const restored = useMemo(
    () => (editing ? parseModuleData(editing.data) : draft),
    [editing, draft],
  )

  // The scoring screen only ever reads id and name; `active` belongs to the
  // host's own roster and means nothing to a match in progress.
  const players: Player[] = useMemo(() => {
    const known = new Map(host.getPlayers().map((p) => [p.id, p.name]))
    return playerIds.map((id) => ({ id, name: known.get(id) ?? '', active: true }))
  }, [host, playerIds])

  // A restored draft already has its cards confirmed: skip straight to the
  // grid instead of asking again. Match setup itself has no draft of its own
  // (out of scope — the grid doesn't exist yet at that step).
  const [objectifCards, setObjectifCards] = useState<ObjectifCardSelection | undefined>(
    () => draft?.objectifCards,
  )

  if (players.length === 0) return null

  if (objectifCards === undefined) {
    return (
      <ModuleRoot>
        <MatchSetupScreen
          playerIds={[...playerIds]}
          initialSelection={restored?.objectifCards}
          onConfirm={setObjectifCards}
          onCancel={onExit}
        />
      </ModuleRoot>
    )
  }

  const mode: ScoreDetailMode =
    editing !== undefined ? { type: 'Edit', matchId: editing.matchId } : { type: 'Create' }

  return (
    <ModuleRoot>
      <ScoreDetailScreen
        initialState={buildInitialState(players, mode, restored?.results ?? [], objectifCards)}
        onChange={(results, cards) => host.saveDraft(toDraft(playerIds, cards, results))}
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
        onCancel={() => {
          // The ✕ in the module bar (#392) leaves the draft in place — it is
          // the safety net a normal exit relies on. Cancelling from inside the
          // grid is the only way to say "start over": without it, a restored
          // draft would be impossible to escape.
          host.clearDraft()
          onExit()
        }}
      />
    </ModuleRoot>
  )
}

/**
 * Carries the module's own look, and confines it.
 *
 * Every rule in `styles.css` is scoped under this class, so the game keeps its
 * identity — Torī Valley's warm washi palette, not Scoreo's flavor — without a
 * single declaration escaping into the host. The names collide on purpose-built
 * tokens (`--color-primary`, `--space-5`…), so an unscoped `:root` here would
 * retint and re-space the whole application, and keep doing it after the player
 * has left: a stylesheet is not unloaded on navigation.
 */
function ModuleRoot({ children }: { children: ReactNode }) {
  return <div className="module-tori-valley">{children}</div>
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
