import {
  Badge,
  Button,
  ButtonRow,
  Chip,
  Dialog,
  Icon,
  NumberField,
  Panel,
  Score,
  Select,
  Stack,
  StandingsCard,
  StandingsGrid,
  StatusLine,
  TabPanel,
  Tabs,
  Text,
} from '@scoreboards/design-system'
import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { buildModuleMatchResult, classementFinal } from '../../application/moduleResult'
import { calculerScore } from '../../domain/calculateurScore'
import { CARTES, EMOJIS_RANG, TYPES_DES } from '../../domain/constantes'
import { totalDes, valeurDe } from '../../domain/lancerDes'
import type { EvenementCoup } from '../../domain/modeles'
import type { Partie } from '../../domain/partie'
import {
  estFinie,
  etatInitial,
  milleSabordsModuleReducer,
  partieDeLEtat,
  versBrouillon,
} from './milleSabordsModuleReducer'
import type {
  MilleSabordsAction,
  MilleSabordsState,
  MilleSabordsTab,
} from './milleSabordsModuleTypes'
import { CRANES_ILE_RAPIDE, GROUPES_RAPIDES, INFOS_CARTE } from './scoresRapides'
import {
  DieCounter,
  GameColumn,
  GameColumns,
  ModuleRoot,
  ScorePreview,
  ScoreTable,
  type PreviewTone,
  type ScoreCell,
  type TotalTone,
} from '../../design'

type Dispatch = (action: MilleSabordsAction) => void

/**
 * 1000 Sabords as the host runs it.
 *
 * The module owns the scoring engine and the turn in progress; Scoreo owns the
 * players, the history and the storage. Nothing here reads `localStorage`: the
 * live game goes through `host.saveDraft`, the finished one through
 * `host.saveMatch`, and the standalone Kotlin app's own keys are left alone.
 *
 * It wears Scoreo's look: the screen composes `@scoreboards/design-system`, and
 * the few pieces only this game draws — the dice, the scoreboard, the score
 * preview — live in `src/design/`.
 */
export default function MilleSabordsModuleScreen({
  host,
  playerIds,
  editing,
  onExit,
}: ScoringModuleScreenProps) {
  const [state, dispatch] = useReducer(milleSabordsModuleReducer, undefined, () =>
    // Reopening a match wins over the draft: the host asked for *that* game.
    etatInitial(playerIds, editing === undefined ? host.loadDraft() : editing.data),
  )

  // The whole reason `saveDraft` exists. The Kotlin app kept the dice, the card
  // and the multiplier in module-level `var`s and persisted only the game, so a
  // reload in the middle of a turn threw away the hand a player had just
  // counted out. Every state transition is written back here instead.
  useEffect(() => {
    host.saveDraft(versBrouillon(state))
  }, [host, state])

  const noms = useMemo(() => {
    const connus = new Map(host.getPlayers().map((joueur) => [joueur.id, joueur.name]))
    return state.joueurs.map((id, index) => connus.get(id) || `Joueur ${index + 1}`)
  }, [host, state.joueurs])

  const partie = useMemo(() => partieDeLEtat(state), [state])

  if (state.joueurs.length === 0) return null

  const enregistrer = () => {
    host.saveMatch(
      buildModuleMatchResult({
        joueurs: state.joueurs,
        historique: state.historique,
        // Present only when reopening: that is what turns the save into an
        // update instead of a second match. No `playedAt` — the host's clock.
        matchId: editing?.matchId,
      }),
    )
    onExit()
  }

  const abandonner = () => {
    host.clearDraft()
    onExit()
  }

  return (
    <ModuleRoot>
      <Stack direction="row" justify="end">
        <BadgeManche state={state} partie={partie} />
      </Stack>

      {estFinie(state, partie) ? (
        <EcranFin
          state={state}
          partie={partie}
          noms={noms}
          dispatch={dispatch}
          onEnregistrer={enregistrer}
        />
      ) : (
        <EcranJeu state={state} partie={partie} noms={noms} dispatch={dispatch} />
      )}

      <Dialog
        open={state.confirmationAbandon}
        title="Abandonner la partie ?"
        closeLabel="Fermer"
        onClose={() => dispatch({ type: 'dismissAbandonConfirm' })}
        actions={
          <ButtonRow align="end">
            <Button variant="secondary" onClick={() => dispatch({ type: 'dismissAbandonConfirm' })}>
              Continuer à jouer
            </Button>
            <Button variant="danger" onClick={abandonner}>
              Abandonner
            </Button>
          </ButtonRow>
        }
      >
        <Text variant="muted" block>
          La partie en cours sera perdue et rien ne sera enregistré dans Scoreo.
        </Text>
      </Dialog>
    </ModuleRoot>
  )
}

function BadgeManche({ state, partie }: { state: MilleSabordsState; partie: Partie }) {
  if (state.finDemandee || partie.estTerminee()) {
    return <Badge tone="warning">🏁 Partie terminée</Badge>
  }
  if (partie.dernierTour) return <Badge tone="warning">⚠️ Dernier tour !</Badge>

  const enCours = state.historique.length % state.joueurs.length > 0
  const manche = Math.max(1, partie.mancheActuelle() + (enCours ? 1 : 0))
  return <Badge>Tour {manche}</Badge>
}

interface VueProps {
  state: MilleSabordsState
  partie: Partie
  noms: readonly string[]
  dispatch: Dispatch
}

const ONGLETS: { value: MilleSabordsTab; label: string }[] = [
  { value: 'calc', label: '🎲 Calculateur' },
  { value: 'manual', label: '✏️ Saisie rapide' },
]

function EcranJeu(props: VueProps) {
  const { state, partie, noms, dispatch } = props
  const index = partie.indexJoueurActuel

  return (
    <GameColumns>
      <GameColumn label="Tableau de bord">
        <Tableau state={state} partie={partie} noms={noms} />
        <Stack direction="row" gap={2} wrap>
          <Button
            variant="secondary"
            size="sm"
            disabled={state.historique.length === 0}
            onClick={() => dispatch({ type: 'undoLast' })}
          >
            ↩ Annuler le coup
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={state.historique.length === 0}
            onClick={() => dispatch({ type: 'requestEnd' })}
          >
            🏁 Terminer la partie
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => dispatch({ type: 'showAbandonConfirm' })}
          >
            🗑 Abandonner
          </Button>
        </Stack>
      </GameColumn>

      <GameColumn label="Tour en cours">
        <Stack gap={1} align="center">
          <Text variant="label">Au tour de</Text>
          <Text variant="heading">{noms[index]}</Text>
        </Stack>

        <Tabs
          ariaLabel="Mode de saisie"
          options={ONGLETS}
          value={state.tab}
          onChange={(tab) => dispatch({ type: 'selectTab', tab })}
        />

        {state.tab === 'calc' ? (
          <OngletCalcul state={state} dispatch={dispatch} />
        ) : (
          <OngletManuel state={state} dispatch={dispatch} />
        )}
      </GameColumn>
    </GameColumns>
  )
}

function OngletCalcul({ state, dispatch }: { state: MilleSabordsState; dispatch: Dispatch }) {
  const total = totalDes(state.des)
  const resultat = total > 0 ? calculerScore(state.des, state.carte) : undefined
  const info = INFOS_CARTE[state.carte]

  return (
    <TabPanel ariaLabel="Calculateur">
      <Select
        label="Carte piochée"
        value={state.carte}
        options={CARTES.map((carte) => ({ value: carte.id, label: carte.label }))}
        onChange={(carte) => dispatch({ type: 'selectCard', carte })}
      />

      <Stack gap={1}>
        {TYPES_DES.map((type) => (
          <DieCounter
            key={type.id}
            face={type.icone}
            label={type.label}
            count={valeurDe(state.des, type.id)}
            onDecrease={() => dispatch({ type: 'changeDie', de: type.id, delta: -1 })}
            onIncrease={() => dispatch({ type: 'changeDie', de: type.id, delta: 1 })}
          />
        ))}
      </Stack>

      <StatusLine tone={total === 8 ? 'success' : 'warning'}>{total} / 8 dés</StatusLine>

      <Button width="full" onClick={() => dispatch({ type: 'submitCalcScore' })}>
        Valider le score
      </Button>

      {info !== undefined && (
        <Text variant="hint" block>
          {info}
        </Text>
      )}

      {resultat !== undefined && (
        <ScorePreview
          score={`${resultat.ileCranes ? '☠️ ' : ''}${resultat.score} pts`}
          tone={previewTone(resultat.score, resultat.ileCranes)}
          details={resultat.details}
        >
          {resultat.magiquePirate && (
            <Stack align="center">
              <Badge tone="solid">🪄 MAGIE PIRATE — Victoire légendaire !</Badge>
            </Stack>
          )}
          {resultat.ileCranes && (
            <StatusLine
              tone="danger"
              details={[`Chaque adversaire perdra ${-resultat.penaliteIle} pts`]}
            >
              ☠️ Île de la Tête de Mort
            </StatusLine>
          )}
        </ScorePreview>
      )}
    </TabPanel>
  )
}

function previewTone(score: number, ileCranes: boolean): PreviewTone {
  if (ileCranes) return 'island'
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'zero'
}

function OngletManuel({ state, dispatch }: { state: MilleSabordsState; dispatch: Dispatch }) {
  return (
    <TabPanel ariaLabel="Saisie rapide">
      <Stack gap={1}>
        <Text variant="label">Score</Text>
        <Stack direction="row" gap={2} align="center" wrap>
          <NumberField
            mode="plain"
            ariaLabel="Score"
            value={state.scoreManuel}
            onChange={(value) => dispatch({ type: 'updateManualScore', value })}
          />
          {state.multiplicateur === 2 && (
            <Button
              size="sm"
              title="Retirer le multiplicateur"
              onClick={() => dispatch({ type: 'toggleMultiplier' })}
            >
              ×2 🎩
            </Button>
          )}
          <Button
            variant="secondary"
            icon="delete"
            label="Remettre le score à zéro"
            onClick={() => dispatch({ type: 'resetManualScore' })}
          />
          <Button onClick={() => dispatch({ type: 'submitManualScore' })}>Valider</Button>
        </Stack>
      </Stack>

      <Stack gap={3}>
        {GROUPES_RAPIDES.map((groupe) => (
          <GroupeRapide titre={groupe.titre} key={groupe.titre}>
            {groupe.boutons.map((bouton) => (
              <Button
                key={bouton.label}
                variant="secondary"
                size="sm"
                title={bouton.titre}
                onClick={() => dispatch({ type: 'quickScore', points: bouton.points })}
              >
                {bouton.label}
              </Button>
            ))}
          </GroupeRapide>
        ))}

        <GroupeRapide titre="🎩 Capitaine">
          <Chip
            selected={state.multiplicateur === 2}
            onClick={() => dispatch({ type: 'toggleMultiplier' })}
          >
            ×2
          </Chip>
        </GroupeRapide>

        <GroupeRapide titre="☠️ Île de la Tête de Mort">
          {CRANES_ILE_RAPIDE.map((cranes) => (
            <Button
              key={cranes}
              variant="danger"
              size="sm"
              title={`-${cranes * 100} pts pour chaque adversaire`}
              onClick={() => dispatch({ type: 'quickSkullIsland', cranes })}
            >
              {`${cranes}💀`}
            </Button>
          ))}
        </GroupeRapide>
      </Stack>
    </TabPanel>
  )
}

function GroupeRapide({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <Stack gap={1}>
      <Text variant="label">{titre}</Text>
      <Stack direction="row" gap={1} wrap>
        {children}
      </Stack>
    </Stack>
  )
}

function Tableau({
  state,
  partie,
  noms,
}: {
  state: MilleSabordsState
  partie: Partie
  noms: readonly string[]
}) {
  const totaux = state.joueurs.map((_, index) => partie.totalJoueur(index))
  const totalMax = Math.max(0, ...totaux)

  return (
    <ScoreTable
      cornerLabel="Tour"
      players={noms.map((nom, index) => ({ key: state.joueurs[index], name: nom }))}
      currentIndex={partie.indexJoueurActuel}
      rounds={partie.manches().map((coups, manche) => ({
        label: `Tour ${manche + 1}`,
        cells: state.joueurs.map((_, index) => celluleCoup(coups[index])),
      }))}
      emptyLabel="Aucun coup joué pour l'instant."
      totalLabel="Total"
      totals={totaux.map((total) => ({ value: total, tone: tonTotal(total, totalMax) }))}
    />
  )
}

function tonTotal(total: number, totalMax: number): TotalTone {
  if (total >= 6000) return 'over'
  if (total === totalMax && totalMax > 0) return 'leading'
  return 'default'
}

/**
 * One player's coup in the grid. An island shows the penalty it inflicted on
 * everyone else rather than a score of its own, because that is the only number
 * the table would otherwise never show.
 */
function celluleCoup(coup: EvenementCoup | undefined): ScoreCell {
  if (coup === undefined) return { text: '—' }

  switch (coup.type) {
    case 'ile':
      return {
        text: `☠️ (${coup.penaliteParAdversaire})`,
        tone: 'island',
        title: `☠️ ${coup.nombreCranes} crânes → ${coup.penaliteParAdversaire} pts par adversaire`,
      }
    case 'manuel':
      return {
        text: String(coup.score),
        tone: tonCellule(coup.score),
        title: `Saisie : ${coup.scoreEntre}${coup.multiplicateur > 1 ? ` ×${coup.multiplicateur}` : ''}`,
      }
    case 'calculateur':
      return coup.ileCranes
        ? { text: `☠️ (${coup.penaliteIle})`, tone: 'island', title: coup.details }
        : { text: String(coup.score), tone: tonCellule(coup.score), title: coup.details }
  }
}

function tonCellule(score: number): ScoreCell['tone'] {
  if (score === 0) return 'zero'
  if (score < 0) return 'negative'
  return 'default'
}

function EcranFin({
  state,
  partie,
  noms,
  dispatch,
  onEnregistrer,
}: VueProps & { onEnregistrer: () => void }) {
  const classement = classementFinal(partie)
  const vainqueur = classement[0]

  return (
    <Panel
      title={`${noms[vainqueur.indexCouleur]} remporte la partie${
        partie.magiquePirate ? ' avec la Magie Pirate !' : ' !'
      }`}
      trailing={<Icon name={partie.magiquePirate ? 'sparkles' : 'trophy'} size="lg" />}
    >
      <Score size="xl" tone="accent">{`${vainqueur.score} points`}</Score>

      <StandingsGrid ariaLabel="Classement final">
        {classement.map((joueur, rang) => (
          <StandingsCard
            key={joueur.nom}
            rank={EMOJIS_RANG[rang]}
            name={noms[joueur.indexCouleur]}
            total={`${joueur.score} pts`}
            lead={rang === 0}
          />
        ))}
      </StandingsGrid>

      <Stack direction="row" gap={2} wrap>
        <Button onClick={onEnregistrer}>💾 Enregistrer la partie</Button>
        <Button
          variant="secondary"
          disabled={state.historique.length === 0}
          onClick={() => dispatch({ type: 'undoLast' })}
        >
          ↩ Annuler le dernier coup
        </Button>
        {state.finDemandee && (
          <Button variant="ghost" onClick={() => dispatch({ type: 'resumeGame' })}>
            ⚓ Reprendre la partie
          </Button>
        )}
      </Stack>
    </Panel>
  )
}
