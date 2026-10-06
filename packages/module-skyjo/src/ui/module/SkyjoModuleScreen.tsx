import {
  Badge,
  Button,
  ButtonRow,
  Chip,
  Dialog,
  NumberField,
  Panel,
  Stack,
  StandingsCard,
  StandingsGrid,
  Text,
} from '@scoreboards/design-system'
import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { useEffect, useMemo, useReducer } from 'react'
import { ModuleRoot, SkyjoTable, SkyjoWinner } from '../../design'
import {
  appliedRoundScores,
  cumulativeTotals,
  END_THRESHOLD,
  type SkyjoRound,
} from '../../domain/round'
import { buildRanking, toModuleMatchResult } from '../../domain/moduleResult'
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
export default function SkyjoModuleScreen({
  host,
  playerIds,
  editing,
  onExit,
}: ScoringModuleScreenProps) {
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
    <ModuleRoot>
      <Stack gap={4}>
        <Stack direction="row" align="center" justify="between" wrap>
          <Text variant="heading">🃏 Skyjo</Text>
          <RoundBadge state={state} finished={finished} />
        </Stack>

        {finished ? (
          <EndScreen
            state={state}
            names={names}
            totals={totals}
            dispatch={dispatch}
            onSave={save}
          />
        ) : (
          <PlayScreen state={state} names={names} totals={totals} dispatch={dispatch} />
        )}
      </Stack>

      <Dialog
        open={state.confirmAbandon}
        title="Abandonner la partie ?"
        onClose={() => dispatch({ type: 'dismissAbandonConfirm' })}
        actions={
          <ButtonRow align="end">
            <Button variant="secondary" onClick={() => dispatch({ type: 'dismissAbandonConfirm' })}>
              Continuer à jouer
            </Button>
            <Button variant="danger" onClick={abandon}>
              Abandonner
            </Button>
          </ButtonRow>
        }
      >
        <Text block variant="muted">
          La partie en cours sera perdue et rien ne sera enregistré dans Scoreo.
        </Text>
      </Dialog>
    </ModuleRoot>
  )
}

function RoundBadge({ state, finished }: { state: SkyjoState; finished: boolean }) {
  if (finished) return <Badge tone="success">🏁 Partie terminée</Badge>
  return <Badge>Manche {state.rounds.length + 1}</Badge>
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
      <Stack direction="row" gap={2} wrap>
        <Button
          variant="secondary"
          disabled={state.rounds.length === 0}
          onClick={() => dispatch({ type: 'undoLastRound' })}
        >
          ↩ Annuler la dernière manche
        </Button>
        <Button variant="danger" onClick={() => dispatch({ type: 'showAbandonConfirm' })}>
          🗑 Abandonner
        </Button>
      </Stack>
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
    <Panel title="Manche en cours">
      <Stack gap={3}>
        <Text variant="label">Qui a terminé la manche ?</Text>
        <Stack direction="row" gap={2} wrap>
          {state.playerIds.map((id) => (
            <Chip
              key={id}
              selected={state.enderPlayerId === id}
              onClick={() => dispatch({ type: 'selectEnder', playerId: id })}
            >
              {names.get(id)}
            </Chip>
          ))}
        </Stack>

        <Text variant="label">Score de la manche</Text>
        {state.playerIds.map((id) => (
          <Stack direction="row" align="center" justify="between" key={id}>
            <Text variant="strong">{names.get(id)}</Text>
            <NumberField
              mode="plain"
              ariaLabel={names.get(id) ?? ''}
              value={state.scoreInputs[id] ?? ''}
              onChange={(value) => dispatch({ type: 'updateScoreInput', playerId: id, value })}
            />
          </Stack>
        ))}

        <Button
          width="full"
          disabled={!canSubmitRound(state)}
          onClick={() => dispatch({ type: 'submitRound' })}
        >
          Valider la manche
        </Button>
      </Stack>
    </Panel>
  )
}

function Scoreboard({ state, names, totals }: Omit<ViewProps, 'dispatch'>) {
  // Lower wins in Skyjo, so the highlighted total is the lowest one — the
  // opposite of what a "leading" total means in 1000 Sabords or Torī Valley.
  const minTotal = totals.size === 0 ? 0 : Math.min(...totals.values())

  return (
    <SkyjoTable
      playerNames={state.playerIds.map((id) => names.get(id) ?? '')}
      rows={state.rounds.map((round, index) => roundRow(round, index, state.playerIds))}
      totals={state.playerIds.map((id) => {
        const value = totals.get(id) ?? 0
        return { value, leading: value === minTotal && value < END_THRESHOLD }
      })}
      totalLabel="Total"
      emptyLabel="Aucune manche jouée pour l'instant."
      doubledLabel="Doublé"
    />
  )
}

function roundRow(round: SkyjoRound, index: number, playerIds: readonly string[]) {
  const applied = appliedRoundScores(round)
  return {
    label: `Manche ${index + 1}`,
    cells: playerIds.map((id) => {
      const entry = round.entries.find((e) => e.playerId === id)
      const score = applied.get(id) ?? 0
      const doubled = id === round.enderPlayerId && entry !== undefined && score !== entry.rawScore
      return { text: doubled ? `${score} ×2` : `${score}`, doubled }
    }),
  }
}

function EndScreen({ state, names, dispatch, onSave }: ViewProps & { onSave: () => void }) {
  const ranking = buildRanking(state.playerIds, state.rounds)
  const winners = ranking.filter((entry) => entry.rank === 1)
  const winnerNames = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' }).format(
    winners.map((entry) => names.get(entry.playerId) ?? ''),
  )
  const title =
    winners.length > 1 ? `Égalité entre ${winnerNames} !` : `${winnerNames} remporte la partie !`

  return (
    <>
      <SkyjoWinner>
        <Text variant="title">{title}</Text>
        <Text variant="mono">{winners[0]?.score ?? 0} points</Text>
      </SkyjoWinner>

      <StandingsGrid ariaLabel="Classement">
        {ranking.map((entry) => (
          <StandingsCard
            key={entry.playerId}
            rank={`${entry.rank}.`}
            name={names.get(entry.playerId) ?? ''}
            total={`${entry.score} pts`}
            lead={entry.rank === 1}
          />
        ))}
      </StandingsGrid>

      <Stack direction="row" gap={2} wrap>
        <Button onClick={onSave}>💾 Enregistrer la partie</Button>
        <Button variant="secondary" onClick={() => dispatch({ type: 'undoLastRound' })}>
          ↩ Annuler la dernière manche
        </Button>
      </Stack>
    </>
  )
}
