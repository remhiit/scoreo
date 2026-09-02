import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { useEffect, useMemo, useReducer } from 'react'
// Bundled with this chunk, so the module arrives styled and costs the host
// nothing until someone opens it.
import '../../styles.css'
import { buildModuleMatchResult, classementFinal } from '../../application/moduleResult'
import { calculerScore } from '../../domain/calculateurScore'
import { CARTES, COULEURS_JOUEURS, EMOJIS_RANG, TYPES_DES } from '../../domain/constantes'
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
import type { MilleSabordsAction, MilleSabordsState } from './milleSabordsModuleTypes'
import { CRANES_ILE_RAPIDE, GROUPES_RAPIDES, INFOS_CARTE } from './scoresRapides'

type Dispatch = (action: MilleSabordsAction) => void

/**
 * 1000 Sabords as the host runs it.
 *
 * The module owns the scoring engine and the turn in progress; Scoreo owns the
 * players, the history and the storage. Nothing here reads `localStorage`: the
 * live game goes through `host.saveDraft`, the finished one through
 * `host.saveMatch`, and the standalone Kotlin app's own keys are left alone.
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
    <div className="module-mille-sabords">
      <div className="ms-shell">
        <header className="ms-header">
          <h1 className="ms-title">🏴‍☠️ 1000 Sabords</h1>
          <BadgeManche state={state} partie={partie} />
        </header>

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

        {state.confirmationAbandon && (
          <div className="ms-modal-overlay">
            <div className="ms-modal" role="dialog" aria-label="Abandonner la partie">
              <h2>Abandonner la partie ?</h2>
              <p>La partie en cours sera perdue et rien ne sera enregistré dans Scoreo.</p>
              <div className="ms-modal-actions">
                <button
                  type="button"
                  className="ms-btn ms-btn-secondary"
                  onClick={() => dispatch({ type: 'dismissAbandonConfirm' })}
                >
                  Continuer à jouer
                </button>
                <button type="button" className="ms-btn ms-btn-danger" onClick={abandonner}>
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

function BadgeManche({ state, partie }: { state: MilleSabordsState; partie: Partie }) {
  if (state.finDemandee || partie.estTerminee()) {
    return <span className="ms-badge ms-badge-final">🏁 Partie terminée</span>
  }
  if (partie.dernierTour) return <span className="ms-badge ms-badge-final">⚠️ Dernier tour !</span>

  const enCours = state.historique.length % state.joueurs.length > 0
  const manche = Math.max(1, partie.mancheActuelle() + (enCours ? 1 : 0))
  return <span className="ms-badge">Tour {manche}</span>
}

interface VueProps {
  state: MilleSabordsState
  partie: Partie
  noms: readonly string[]
  dispatch: Dispatch
}

function EcranJeu(props: VueProps) {
  const { state, partie, noms, dispatch } = props
  const index = partie.indexJoueurActuel

  return (
    <div className="ms-layout">
      <section className="ms-col" aria-label="Tableau de bord">
        <Tableau state={state} partie={partie} noms={noms} />
        <div className="ms-actions">
          <button
            type="button"
            className="ms-btn ms-btn-secondary"
            disabled={state.historique.length === 0}
            onClick={() => dispatch({ type: 'undoLast' })}
          >
            ↩ Annuler le coup
          </button>
          <button
            type="button"
            className="ms-btn ms-btn-secondary"
            disabled={state.historique.length === 0}
            onClick={() => dispatch({ type: 'requestEnd' })}
          >
            🏁 Terminer la partie
          </button>
          <button
            type="button"
            className="ms-btn ms-btn-danger"
            onClick={() => dispatch({ type: 'showAbandonConfirm' })}
          >
            🗑 Abandonner
          </button>
        </div>
      </section>

      <section className="ms-col" aria-label="Tour en cours">
        <div className="ms-turn">
          <div className="ms-turn-label">Au tour de</div>
          <div className="ms-turn-player" style={{ color: COULEURS_JOUEURS[index] }}>
            {noms[index]}
          </div>
        </div>

        <div className="ms-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={state.tab === 'calc'}
            className={onglet(state.tab === 'calc')}
            onClick={() => dispatch({ type: 'selectTab', tab: 'calc' })}
          >
            🎲 Calculateur
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={state.tab === 'manual'}
            className={onglet(state.tab === 'manual')}
            onClick={() => dispatch({ type: 'selectTab', tab: 'manual' })}
          >
            ✏️ Saisie rapide
          </button>
        </div>

        {state.tab === 'calc' ? (
          <OngletCalcul state={state} dispatch={dispatch} />
        ) : (
          <OngletManuel state={state} dispatch={dispatch} />
        )}
      </section>
    </div>
  )
}

function onglet(actif: boolean): string {
  return actif ? 'ms-tab ms-tab-active' : 'ms-tab'
}

function OngletCalcul({ state, dispatch }: { state: MilleSabordsState; dispatch: Dispatch }) {
  const total = totalDes(state.des)
  const resultat = total > 0 ? calculerScore(state.des, state.carte) : undefined
  const info = INFOS_CARTE[state.carte]

  return (
    <div className="ms-panel" role="tabpanel" aria-label="Calculateur">
      <div className="ms-field">
        <label htmlFor="ms-card">Carte piochée</label>
        <select
          id="ms-card"
          value={state.carte}
          onChange={(event) => dispatch({ type: 'selectCard', carte: event.target.value })}
        >
          {CARTES.map((carte) => (
            <option key={carte.id} value={carte.id}>
              {carte.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ms-dice">
        {TYPES_DES.map((type) => (
          <div className="ms-dice-row" key={type.id}>
            <span className="ms-dice-icon" aria-hidden="true">
              {type.icone}
            </span>
            <span className="ms-dice-label">{type.label}</span>
            <div className="ms-dice-controls">
              <button
                type="button"
                className="ms-step"
                aria-label={`Retirer un ${type.label}`}
                onClick={() => dispatch({ type: 'changeDie', de: type.id, delta: -1 })}
              >
                −
              </button>
              <output className="ms-dice-count" aria-label={`${type.label} : compteur`}>
                {valeurDe(state.des, type.id)}
              </output>
              <button
                type="button"
                className="ms-step"
                aria-label={`Ajouter un ${type.label}`}
                onClick={() => dispatch({ type: 'changeDie', de: type.id, delta: 1 })}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={total === 8 ? 'ms-dice-total ms-valid' : 'ms-dice-total ms-warning'}>
        {total === 8 ? '✅' : '⚠️'} {total} / 8 dés
      </div>

      <button
        type="button"
        className="ms-btn ms-btn-primary ms-btn-wide"
        onClick={() => dispatch({ type: 'submitCalcScore' })}
      >
        Valider le score
      </button>

      {info !== undefined && <p className="ms-card-info">{info}</p>}

      {resultat !== undefined && (
        <div className="ms-preview">
          <div className={`ms-preview-score ${classeScore(resultat.score, resultat.ileCranes)}`}>
            {resultat.ileCranes ? '☠️ ' : ''}
            {resultat.score} pts
          </div>
          <div className="ms-preview-details">{resultat.details}</div>
          {resultat.magiquePirate && (
            <div className="ms-magie">🪄 MAGIE PIRATE — Victoire légendaire !</div>
          )}
          {resultat.ileCranes && (
            <div className="ms-island">
              <strong>☠️ Île de la Tête de Mort</strong>
              <span>Chaque adversaire perdra {-resultat.penaliteIle} pts</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function classeScore(score: number, ileCranes: boolean): string {
  if (ileCranes) return 'ms-score-island'
  if (score > 0) return 'ms-score-positive'
  if (score < 0) return 'ms-score-negative'
  return 'ms-score-zero'
}

function OngletManuel({ state, dispatch }: { state: MilleSabordsState; dispatch: Dispatch }) {
  return (
    <div className="ms-panel" role="tabpanel" aria-label="Saisie rapide">
      <div className="ms-manual">
        <label htmlFor="ms-manual-score">Score</label>
        <div className="ms-manual-row">
          <input
            id="ms-manual-score"
            type="number"
            inputMode="numeric"
            value={state.scoreManuel}
            onChange={(event) => dispatch({ type: 'updateManualScore', value: event.target.value })}
          />
          {state.multiplicateur === 2 && (
            <button
              type="button"
              className="ms-multiplier"
              aria-label="Retirer le multiplicateur"
              onClick={() => dispatch({ type: 'toggleMultiplier' })}
            >
              ×2 🎩
            </button>
          )}
          <button
            type="button"
            className="ms-btn ms-btn-secondary"
            aria-label="Remettre le score à zéro"
            onClick={() => dispatch({ type: 'resetManualScore' })}
          >
            🗑
          </button>
          <button
            type="button"
            className="ms-btn ms-btn-primary"
            onClick={() => dispatch({ type: 'submitManualScore' })}
          >
            Valider
          </button>
        </div>
      </div>

      <div className="ms-quick">
        {GROUPES_RAPIDES.map((groupe) => (
          <div className="ms-quick-group" key={groupe.titre}>
            <div className="ms-quick-title">{groupe.titre}</div>
            <div className="ms-quick-row">
              {groupe.boutons.map((bouton) => (
                <button
                  type="button"
                  key={bouton.label}
                  className="ms-chip"
                  title={bouton.titre}
                  onClick={() => dispatch({ type: 'quickScore', points: bouton.points })}
                >
                  {bouton.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="ms-quick-group">
          <div className="ms-quick-title">🎩 Capitaine</div>
          <div className="ms-quick-row">
            <button
              type="button"
              className={state.multiplicateur === 2 ? 'ms-chip ms-chip-active' : 'ms-chip'}
              aria-pressed={state.multiplicateur === 2}
              title="Double le score saisi"
              onClick={() => dispatch({ type: 'toggleMultiplier' })}
            >
              ×2
            </button>
          </div>
        </div>

        <div className="ms-quick-group">
          <div className="ms-quick-title">☠️ Île de la Tête de Mort</div>
          <div className="ms-quick-row">
            {CRANES_ILE_RAPIDE.map((cranes) => (
              <button
                type="button"
                key={cranes}
                className="ms-chip ms-chip-danger"
                title={`-${cranes * 100} pts pour chaque adversaire`}
                onClick={() => dispatch({ type: 'quickSkullIsland', cranes })}
              >
                {cranes}💀
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
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
  const manches = partie.manches()
  const totaux = state.joueurs.map((_, index) => partie.totalJoueur(index))
  const totalMax = Math.max(0, ...totaux)

  return (
    <div className="ms-table-wrap">
      <table className="ms-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="ms-sr-only">Tour</span>
            </th>
            {noms.map((nom, index) => (
              <th
                scope="col"
                key={state.joueurs[index]}
                className={index === partie.indexJoueurActuel ? 'ms-current' : undefined}
                style={{ color: COULEURS_JOUEURS[index] }}
              >
                {nom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {manches.map((coups, manche) => (
            <tr key={manche}>
              <th scope="row" className="ms-round-label">
                Tour {manche + 1}
              </th>
              {state.joueurs.map((id, index) => (
                <CelluleCoup key={id} coup={coups[index]} />
              ))}
            </tr>
          ))}
          {manches.length === 0 && (
            <tr>
              <td className="ms-empty" colSpan={state.joueurs.length + 1}>
                Aucun coup joué pour l'instant.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="ms-round-label">
              Total
            </th>
            {totaux.map((total, index) => (
              <td key={state.joueurs[index]} className={classeTotal(total, totalMax)}>
                {total}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function classeTotal(total: number, totalMax: number): string {
  if (total >= 6000) return 'ms-total ms-over-6000'
  if (total === totalMax && totalMax > 0) return 'ms-total ms-leading'
  return 'ms-total'
}

/**
 * One player's coup in the grid. An island shows the penalty it inflicted on
 * everyone else rather than a score of its own, because that is the only number
 * the table would otherwise never show.
 */
function CelluleCoup({ coup }: { coup: EvenementCoup | undefined }) {
  if (coup === undefined) return <td className="ms-cell">—</td>

  switch (coup.type) {
    case 'ile':
      return (
        <td
          className="ms-cell ms-cell-island"
          title={`☠️ ${coup.nombreCranes} crânes → ${coup.penaliteParAdversaire} pts par adversaire`}
        >
          ☠️ ({coup.penaliteParAdversaire})
        </td>
      )
    case 'manuel':
      return (
        <td
          className={`ms-cell ${classeCellule(coup.score)}`}
          title={`Saisie : ${coup.scoreEntre}${coup.multiplicateur > 1 ? ` ×${coup.multiplicateur}` : ''}`}
        >
          {coup.score}
        </td>
      )
    case 'calculateur':
      return coup.ileCranes ? (
        <td className="ms-cell ms-cell-island" title={coup.details}>
          ☠️ ({coup.penaliteIle})
        </td>
      ) : (
        <td className={`ms-cell ${classeCellule(coup.score)}`} title={coup.details}>
          {coup.score}
        </td>
      )
  }
}

function classeCellule(score: number): string {
  if (score === 0) return 'ms-cell-zero'
  if (score < 0) return 'ms-cell-negative'
  return ''
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
    <div className="ms-end">
      <div className="ms-trophy" aria-hidden="true">
        {partie.magiquePirate ? '🪄' : '🏆'}
      </div>
      <h2>
        {noms[vainqueur.indexCouleur]} remporte la partie
        {partie.magiquePirate ? ' avec la Magie Pirate !' : ' !'}
      </h2>
      <p className="ms-winner-score">{vainqueur.score} points</p>

      <ol className="ms-ranking">
        {classement.map((joueur, rang) => (
          <li key={joueur.nom}>
            <span className="ms-rank" aria-hidden="true">
              {EMOJIS_RANG[rang]}
            </span>
            <span className="ms-rank-name" style={{ color: COULEURS_JOUEURS[joueur.indexCouleur] }}>
              {noms[joueur.indexCouleur]}
            </span>
            <span className="ms-rank-score">{joueur.score} pts</span>
          </li>
        ))}
      </ol>

      <div className="ms-actions">
        <button type="button" className="ms-btn ms-btn-primary" onClick={onEnregistrer}>
          💾 Enregistrer la partie
        </button>
        <button
          type="button"
          className="ms-btn ms-btn-secondary"
          disabled={state.historique.length === 0}
          onClick={() => dispatch({ type: 'undoLast' })}
        >
          ↩ Annuler le dernier coup
        </button>
        {state.finDemandee && (
          <button
            type="button"
            className="ms-btn ms-btn-ghost"
            onClick={() => dispatch({ type: 'resumeGame' })}
          >
            ⚓ Reprendre la partie
          </button>
        )}
      </div>
    </div>
  )
}
