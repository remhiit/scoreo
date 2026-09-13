import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { useEffect, useMemo, useReducer } from 'react'
// Bundled with this chunk, so the module arrives styled and costs the host
// nothing until someone opens it.
import '../../styles.css'
import { appliedRoundScores, cumulativeTotals, END_THRESHOLD, type SkyjoRound } from '../../domain/round'
import { toModuleMatchResult } from '../../domain/moduleResult'
import {
  buildInitialState,
  canSubmitRound,
  isFinished,
  skyjoModuleReducer,
  toDraft,
} from './skyjoModuleReducer'
import type { SkyjoAction, SkyjoState } from './skyjoModuleTypes'

type Dispatch = (action: SkyjoAction) => void

/**
 * Skyjo as the host runs it: a manual score counter for the physical card
 * game, not a simulator. Players add up their revealed cards at the table and
 * enter the total here; the module tracks the running totals, the doubling
 * rule and the end-of-game threshold.
 */
export default function SkyjoModuleScreen({ host, playerIds, editing, onExit }: ScoringModuleScreenProps) {
  const [state, dispatch] = useReducer(skyjoModuleReducer, undefined, () =>
    // Reopening a match wins over the draft: the host asked for *that* game.
    buildInitialState(playerIds, editing === undefined ? host.loadDraft() : editing.data),
  )

  // The turn in progress must survive a reload — the whole reason the draft
  // trio exists (see `doc/technical/module-contract.md`).
  useEffect(() => {
    host.saveDraft(toDraft(state))
  }, [host, state])

  const names = useMemo(() => {
    const known = new Map(host.getPlayers().map((player) => [player.id, player.name]))
    return new Map(state.playerIds.map((id, index) => [id, known.get(id) ?? `Joueur ${index + 1}`]))
  }, [host, state.playerIds])

  if (state.playerIds.length === 0) return null

  const totals = cumulativeTotals(state.playerIds, state.rounds)
  const finished = isFinished(state)

  const save = () => {
    host.saveMatch(
      toModuleMatchResult({
        playerIds: state.playerIds,
        rounds: state.rounds,
        // Present only when reopening: turns the save into an update instead
        // of a second match. No `playedAt` — the host's own clock.
        matchId: editing?.matchId,
      }),
    )
    onExit()
  }

  const abandon = () => {
    host.clearDraft()
    onExit()
  }

  return (
    <div className="module-skyjo">
      <div className="sj-shell">
        <header className="sj-header">
          <h1 className="sj-title">🃏 Skyjo</h1>
          <RoundBadge state={state} finished={finished} />
        </header>

        {finished ? (
          <EndScreen state={state} names={names} totals={totals} dispatch={dispatch} onSave={save} />
        ) : (
          <PlayScreen state={state} names={names} totals={totals} dispatch={dispatch} />
        )}

        {state.confirmAbandon && (
          <div className="sj-modal-overlay">
            <div className="sj-modal" role="dialog" aria-label="Abandonner la partie">
              <h2>Abandonner la partie ?</h2>
              <p>La partie en cours sera perdue et rien ne sera enregistré dans Scoreo.</p>
              <div className="sj-modal-actions">
                <button
                  type="button"
                  className="sj-btn sj-btn-secondary"
                  onClick={() => dispatch({ type: 'dismissAbandonConfirm' })}
                >
                  Continuer à jouer
                </button>
                <button type="button" className="sj-btn sj-btn-danger" onClick={abandon}>
                  Abandonner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RoundBadge({ state, finished }: { state: SkyjoState; finished: boolean }) {
  if (finished) return <span className="sj-badge sj-badge-final">🏁 Partie terminée</span>
  return <span className="sj-badge">Manche {state.rounds.length + 1}</span>
}

interface ViewProps {
  state: SkyjoState
  names: ReadonlyMap<string, string>
  totals: ReadonlyMap<string, number>
  dispatch: Dispatch
}

function PlayScreen({ state, names, totals, dispatch }: ViewProps) {
  return (
    <>
      <RoundEntryPanel state={state} names={names} dispatch={dispatch} />
      <Scoreboard state={state} names={names} totals={totals} />
      <div className="sj-actions">
        <button
          type="button"
          className="sj-btn sj-btn-secondary"
          disabled={state.rounds.length === 0}
          onClick={() => dispatch({ type: 'undoLastRound' })}
        >
          ↩ Annuler la dernière manche
        </button>
        <button
          type="button"
          className="sj-btn sj-btn-danger"
          onClick={() => dispatch({ type: 'showAbandonConfirm' })}
        >
          🗑 Abandonner
        </button>
      </div>
    </>
  )
}

function RoundEntryPanel({
  state,
  names,
  dispatch,
}: {
  state: SkyjoState
  names: ReadonlyMap<string, string>
  dispatch: Dispatch
}) {
  return (
    <section className="sj-panel" aria-label="Manche en cours">
      <h2 className="sj-panel-title">Qui a terminé la manche ?</h2>
      <div className="sj-ender-row" role="radiogroup" aria-label="Qui a terminé la manche">
        {state.playerIds.map((id) => (
          <button
            type="button"
            key={id}
            role="radio"
            aria-checked={state.enderPlayerId === id}
            className={state.enderPlayerId === id ? 'sj-chip sj-chip-active' : 'sj-chip'}
            onClick={() => dispatch({ type: 'selectEnder', playerId: id })}
          >
            {names.get(id)}
          </button>
        ))}
      </div>

      <h2 className="sj-panel-title">Score de la manche</h2>
      {state.playerIds.map((id) => (
        <div className="sj-score-row" key={id}>
          <label htmlFor={`sj-score-${id}`} className="sj-score-name">
            {names.get(id)}
          </label>
          <input
            id={`sj-score-${id}`}
            className="sj-score-input"
            type="number"
            inputMode="numeric"
            value={state.scoreInputs[id] ?? ''}
            onChange={(event) =>
              dispatch({ type: 'updateScoreInput', playerId: id, value: event.target.value })
            }
          />
        </div>
      ))}

      <button
        type="button"
        className="sj-btn sj-btn-primary"
        disabled={!canSubmitRound(state)}
        onClick={() => dispatch({ type: 'submitRound' })}
      >
        Valider la manche
      </button>
    </section>
  )
}

function Scoreboard({ state, names, totals }: Omit<ViewProps, 'dispatch'>) {
  // Lower wins in Skyjo, so the highlighted total is the lowest one — the
  // opposite of what a "leading" total means in 1000 Sabords or Torī Valley.
  const minTotal = totals.size === 0 ? 0 : Math.min(...totals.values())

  return (
    <div className="sj-table-wrap">
      <table className="sj-table">
        <thead>
          <tr>
            <th scope="col" />
            {state.playerIds.map((id) => (
              <th scope="col" key={id}>
                {names.get(id)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.rounds.map((round, index) => (
            <RoundRow key={index} round={round} index={index} playerIds={state.playerIds} />
          ))}
          {state.rounds.length === 0 && (
            <tr>
              <td className="sj-empty" colSpan={state.playerIds.length + 1}>
                Aucune manche jouée pour l'instant.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="sj-round-label">
              Total
            </th>
            {state.playerIds.map((id) => {
              const total = totals.get(id) ?? 0
              const leading = total === minTotal ? 'sj-leading' : undefined
              return (
                <td key={id} className={['sj-total', total >= END_THRESHOLD ? undefined : leading].join(' ')}>
                  {total}
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function RoundRow({
  round,
  index,
  playerIds,
}: {
  round: SkyjoRound
  index: number
  playerIds: readonly string[]
}) {
  const applied = appliedRoundScores(round)
  return (
    <tr>
      <th scope="row" className="sj-round-label">
        Manche {index + 1}
      </th>
      {playerIds.map((id) => {
        const entry = round.entries.find((e) => e.playerId === id)
        const score = applied.get(id) ?? 0
        const doubled = id === round.enderPlayerId && entry !== undefined && score !== entry.rawScore
        return (
          <td key={id} className={doubled ? 'sj-cell-doubled' : undefined} title={doubled ? 'Doublé' : undefined}>
            {score}
            {doubled ? ' ×2' : ''}
          </td>
        )
      })}
    </tr>
  )
}

function EndScreen({
  state,
  names,
  totals,
  dispatch,
  onSave,
}: ViewProps & { onSave: () => void }) {
  const ranked = [...state.playerIds].sort((a, b) => (totals.get(a) ?? 0) - (totals.get(b) ?? 0))
  const winnerId = ranked[0]

  return (
    <div className="sj-end">
      <div className="sj-trophy" aria-hidden="true">
        🏆
      </div>
      <h2>{names.get(winnerId)} remporte la partie !</h2>
      <p className="sj-winner-score">{totals.get(winnerId)} points</p>

      <ol className="sj-ranking">
        {ranked.map((id) => (
          <li key={id}>
            <span className="sj-rank-name">{names.get(id)}</span>
            <span className="sj-rank-score">{totals.get(id)} pts</span>
          </li>
        ))}
      </ol>

      <div className="sj-actions">
        <button type="button" className="sj-btn sj-btn-primary" onClick={onSave}>
          💾 Enregistrer la partie
        </button>
        <button
          type="button"
          className="sj-btn sj-btn-secondary"
          onClick={() => dispatch({ type: 'undoLastRound' })}
        >
          ↩ Annuler la dernière manche
        </button>
      </div>
    </div>
  )
}
