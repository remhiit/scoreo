import {
  Badge,
  Button,
  ButtonRow,
  Chip,
  Dialog,
  HistoryCell,
  ModuleGameActions,
  Panel,
  RoundCard,
  Score,
  Stack,
  StandingsCard,
  StandingsGrid,
  Text,
} from '@scoreboards/design-system'
import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { useEffect, useMemo, useReducer } from 'react'
import { ModuleRoot } from '../../design'
import { flip7Manifest } from '../../module'
import {
  ADDITIVE_MODIFIERS,
  END_THRESHOLD,
  FLIP_7_BONUS,
  handScore,
  isFlip7,
  NUMBER_VALUES,
} from '../../domain/hand'
import { buildRanking, toModuleMatch } from '../../domain/moduleResult'
import { roundScores } from '../../domain/round'
import {
  buildEditingState,
  buildInitialState,
  flip7ModuleReducer,
  handOf,
  isFinished,
  isInTieBreak,
  toDraft,
} from './flip7ModuleReducer'
import type { Flip7Action, Flip7State } from './flip7ModuleTypes'

const GAME_ACTION_LABELS = {
  undo: 'Annuler la dernière manche',
  abandon: 'Abandonner',
  save: 'Enregistrer la partie',
}

type Dispatch = (action: Flip7Action) => void

/**
 * Flip 7 as the host runs it: a score calculator for the physical card game.
 * At the end of each round, every player taps the cards left in front of them
 * (or "Bust"), and the module applies the scoring order — Number cards, ×2,
 * modifiers, Flip 7 bonus — keeps the totals and calls the game at 200.
 */
export default function Flip7ModuleScreen({
  host,
  playerIds,
  editing,
  onExit,
}: ScoringModuleScreenProps) {
  const [state, dispatch] = useReducer(flip7ModuleReducer, undefined, () =>
    // Reopening a match wins over the draft: the host asked for *that* game.
    editing === undefined
      ? buildInitialState(playerIds, host.loadDraft())
      : buildEditingState(
          playerIds,
          editing.version === flip7Manifest.dataVersion ? editing.data : undefined,
        ),
  )

  // The round being entered must survive a reload — the whole reason the draft
  // trio exists (see `doc/technical/module-contract.md`). A reopened match is
  // already stored on the host's side: it never touches the draft slot, which
  // may hold another, unfinished game.
  useEffect(() => {
    if (editing === undefined) host.saveDraft(toDraft(state))
  }, [host, state, editing])

  const names = useMemo(() => {
    const known = new Map(host.getPlayers().map((player) => [player.id, player.name]))
    return new Map(state.playerIds.map((id, index) => [id, known.get(id) ?? `Joueur ${index + 1}`]))
  }, [host, state.playerIds])

  if (state.playerIds.length === 0) return null

  const finished = isFinished(state)

  const save = () => {
    host.saveMatch(
      toModuleMatch({
        playerIds: state.playerIds,
        rounds: state.rounds,
        // Present only when reopening: turns the save into an update.
        matchId: editing?.matchId,
      }),
    )
    onExit()
  }

  const abandon = () => {
    if (editing === undefined) host.clearDraft()
    onExit()
  }

  return (
    <ModuleRoot>
      <Stack gap={4}>
        <Stack direction="row" align="center" justify="between" wrap>
          <Text variant="heading">🃏 Flip 7</Text>
          {finished ? (
            <Badge tone="success">🏁 Partie terminée</Badge>
          ) : (
            <Badge>Manche {state.rounds.length + 1}</Badge>
          )}
        </Stack>

        {finished ? (
          <EndScreen state={state} names={names} dispatch={dispatch} onSave={save} />
        ) : (
          <PlayScreen state={state} names={names} dispatch={dispatch} />
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

interface ViewProps {
  state: Flip7State
  names: ReadonlyMap<string, string>
  dispatch: Dispatch
}

function PlayScreen({ state, names, dispatch }: ViewProps) {
  return (
    <>
      {isInTieBreak(state) && (
        <Text block variant="warning">
          Égalité en tête au-delà de {END_THRESHOLD} points : on joue une manche de plus.
        </Text>
      )}

      {state.playerIds.map((id) => (
        <HandPanel
          key={id}
          state={state}
          playerId={id}
          name={names.get(id) ?? ''}
          dispatch={dispatch}
        />
      ))}

      <Button width="full" onClick={() => dispatch({ type: 'submitRound' })}>
        Valider la manche
      </Button>

      <Standings state={state} names={names} />
      <RoundLog state={state} names={names} />

      <ModuleGameActions
        phase="playing"
        labels={GAME_ACTION_LABELS}
        undoDisabled={state.rounds.length === 0}
        onUndo={() => dispatch({ type: 'undoLastRound' })}
        onAbandon={() => dispatch({ type: 'showAbandonConfirm' })}
      />
    </>
  )
}

function HandPanel({
  state,
  playerId,
  name,
  dispatch,
}: {
  state: Flip7State
  playerId: string
  name: string
  dispatch: Dispatch
}) {
  const hand = handOf(state, playerId)
  const score = handScore(hand)

  return (
    <Panel
      title={name}
      trailing={
        <Badge
          tone={hand.busted ? 'danger' : isFlip7(hand) ? 'success' : 'accent'}
          ariaLabel={`Score de la manche de ${name} : ${score}`}
        >
          {hand.busted ? '💥 0' : isFlip7(hand) ? `★ ${score}` : `${score}`}
        </Badge>
      }
    >
      <Stack gap={3}>
        <Text variant="label">Cartes Nombre</Text>
        <Stack direction="row" gap={2} wrap>
          {NUMBER_VALUES.map((value) => (
            <Chip
              key={value}
              selected={hand.numbers.includes(value)}
              onClick={() => dispatch({ type: 'toggleNumber', playerId, value })}
            >
              {value}
            </Chip>
          ))}
        </Stack>

        <Text variant="label">Modificateurs</Text>
        <Stack direction="row" gap={2} wrap>
          {ADDITIVE_MODIFIERS.map((value) => (
            <Chip
              key={value}
              selected={hand.modifiers.includes(value)}
              onClick={() => dispatch({ type: 'toggleModifier', playerId, value })}
            >
              +{value}
            </Chip>
          ))}
          <Chip
            selected={hand.doubled}
            onClick={() => dispatch({ type: 'toggleDoubled', playerId })}
          >
            ×2
          </Chip>
        </Stack>

        <Stack direction="row" gap={2} align="center" wrap>
          <Chip selected={hand.busted} onClick={() => dispatch({ type: 'toggleBusted', playerId })}>
            💥 Bust
          </Chip>
          {hand.busted && <Text variant="muted">Aucun point pour cette manche.</Text>}
          {isFlip7(hand) && (
            <Text variant="success">Flip 7 ! +{FLIP_7_BONUS} points de bonus.</Text>
          )}
        </Stack>
      </Stack>
    </Panel>
  )
}

function Standings({ state, names }: Omit<ViewProps, 'dispatch'>) {
  if (state.rounds.length === 0) return null
  const ranking = buildRanking(state.playerIds, state.rounds)
  const last = roundScores(state.rounds[state.rounds.length - 1])

  return (
    <StandingsGrid ariaLabel="Classement">
      {ranking.map((entry) => (
        <StandingsCard
          key={entry.playerId}
          rank={`${entry.rank}.`}
          name={names.get(entry.playerId) ?? ''}
          total={`${entry.score} pts`}
          delta={`+${last.get(entry.playerId) ?? 0}`}
          lead={entry.rank === 1}
        />
      ))}
    </StandingsGrid>
  )
}

function RoundLog({ state, names }: Omit<ViewProps, 'dispatch'>) {
  if (state.rounds.length === 0) {
    return (
      <Text block variant="muted">
        Aucune manche jouée pour l'instant.
      </Text>
    )
  }

  return (
    <Stack gap={2}>
      {state.rounds
        .map((round, index) => ({ round, index }))
        .reverse()
        .map(({ round, index }) => (
          <RoundCard key={index} title={`Manche ${index + 1}`}>
            {round.entries.map((entry) => (
              <HistoryCell key={entry.playerId} name={names.get(entry.playerId) ?? ''}>
                <Score
                  size="sm"
                  tone={isFlip7(entry.hand) ? 'accent' : entry.hand.busted ? 'muted' : 'default'}
                >
                  {entry.hand.busted
                    ? '💥 0'
                    : isFlip7(entry.hand)
                      ? `★ ${handScore(entry.hand)}`
                      : handScore(entry.hand)}
                </Score>
              </HistoryCell>
            ))}
          </RoundCard>
        ))}
    </Stack>
  )
}

function EndScreen({ state, names, dispatch, onSave }: ViewProps & { onSave: () => void }) {
  const ranking = buildRanking(state.playerIds, state.rounds)
  const winner = ranking[0]

  return (
    <>
      <Panel title={`🏆 ${names.get(winner.playerId) ?? ''} remporte la partie !`}>
        <Text variant="mono">{winner.score} points</Text>
      </Panel>

      <StandingsGrid ariaLabel="Classement final">
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

      <RoundLog state={state} names={names} />

      <ModuleGameActions
        phase="finished"
        labels={GAME_ACTION_LABELS}
        onUndo={() => dispatch({ type: 'undoLastRound' })}
        onSave={onSave}
      />
    </>
  )
}
