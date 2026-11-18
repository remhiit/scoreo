import {
  GAMES_SCREEN,
  HALL_OF_FAME_SCREEN,
  HISTORY_SCREEN,
  HOME_SCREEN,
  IMPORT_SCREEN,
  moduleScoreScreen,
  scoreDetailScreen,
  STATS_SCREEN,
  SYNC_SCREEN,
  type Screen,
} from 'scoreo/catalog'
import type { AppScreen } from '../shell/types'
import { bindModule, PLAYERS, seededServices, TAROT, TAROT_DRAFT, UNO } from './fixtures'
import { LiveApp } from './LiveApp'

const [ALICE, BRUNO, CHLOE, DAVID] = PLAYERS.map((p) => p.id)

/** One module's grid, on a game just bound to it, with the players it fits. */
function moduleState(name: string, moduleId: string, players: string[]) {
  return {
    name,
    frame: 'phone' as const,
    render: () => (
      <LiveApp
        services={() => seededServices()}
        screen={(services) => moduleScoreScreen(moduleId, bindModule(services, moduleId), players)}
      />
    ),
  }
}

/**
 * Every screen of the app's router, keyed by its `Screen['type']`: the type
 * checker refuses this object until a new screen has its entry, so no screen
 * ships without its trace here.
 */
const BY_TYPE: Record<Screen['type'], Omit<AppScreen, 'type'>> = {
  Home: {
    title: 'Accueil',
    summary:
      'Choisir les joueurs de la soirée, lancer une partie ou reprendre celle laissée en cours, gérer la liste des joueurs.',
    states: [
      {
        name: 'Soirée habituelle',
        frame: 'phone',
        render: () => <LiveApp services={() => seededServices()} screen={() => HOME_SCREEN} />,
      },
      {
        name: 'Partie à reprendre',
        frame: 'phone',
        render: () => (
          <LiveApp
            services={() => seededServices({ draft: TAROT_DRAFT })}
            screen={() => HOME_SCREEN}
          />
        ),
      },
      {
        name: 'Premier lancement',
        frame: 'phone',
        render: () => (
          <LiveApp services={() => seededServices({ history: false })} screen={() => HOME_SCREEN} />
        ),
      },
    ],
  },
  ScoreDetail: {
    title: 'Saisie des scores',
    summary:
      'Entrer les scores manche par manche d’un jeu sans module, voir le classement évoluer, enregistrer la partie.',
    states: [
      {
        name: 'Nouvelle partie de Tarot',
        frame: 'phone',
        render: () => (
          <LiveApp
            services={() => seededServices()}
            screen={() => scoreDetailScreen(TAROT.id, [ALICE, BRUNO, CHLOE, DAVID])}
          />
        ),
      },
      {
        name: 'Modifier une partie d’Uno',
        frame: 'phone',
        render: () => (
          <LiveApp
            services={() => seededServices()}
            screen={(services) => {
              const uno = services.matchRepository.findById('m-2')!
              return scoreDetailScreen(
                UNO.id,
                uno.playerScores.map((s) => s.playerId),
                uno.id,
              )
            }}
          />
        ),
      },
    ],
  },
  ModuleScore: {
    title: 'Jeu à module',
    summary:
      'Un jeu qui a son propre compteur : le module prend tout l’écran, Scoreo ne garde qu’une barre fine pour en sortir.',
    states: [
      moduleState('Skyjo', 'skyjo', [ALICE, BRUNO, CHLOE]),
      moduleState('Flip 7', 'flip-7', [ALICE, BRUNO, CHLOE, DAVID]),
      moduleState('1000 Sabords', 'mille-sabords', [ALICE, BRUNO, CHLOE]),
      moduleState('Torī Valley', 'tori-valley', [ALICE, BRUNO]),
    ],
  },
  History: {
    title: 'Historique',
    summary:
      'Toutes les parties enregistrées, de la plus récente à la plus ancienne, filtrables par jeu.',
    states: [
      {
        name: 'Après un mois de soirées',
        frame: 'phone',
        render: () => <LiveApp services={() => seededServices()} screen={() => HISTORY_SCREEN} />,
      },
      {
        name: 'Aucune partie',
        frame: 'phone',
        render: () => (
          <LiveApp
            services={() => seededServices({ history: false })}
            screen={() => HISTORY_SCREEN}
          />
        ),
      },
    ],
  },
  Stats: {
    title: 'Statistiques',
    summary: 'Les confrontations entre joueurs et les trophées, jeu par jeu.',
    states: [
      {
        name: 'Après un mois de soirées',
        frame: 'phone',
        render: () => <LiveApp services={() => seededServices()} screen={() => STATS_SCREEN} />,
      },
    ],
  },
  HallOfFame: {
    title: 'Hall of Fame',
    summary: 'Les records et les titres de chaque joueur, tous jeux confondus.',
    states: [
      {
        name: 'Après un mois de soirées',
        frame: 'phone',
        render: () => (
          <LiveApp services={() => seededServices()} screen={() => HALL_OF_FAME_SCREEN} />
        ),
      },
    ],
  },
  Games: {
    title: 'Jeux',
    summary:
      'Créer un jeu, régler ses règles (condition de victoire, mode de score, départage), archiver ou fusionner des jeux.',
    states: [
      {
        name: 'Jeux de la bande',
        frame: 'phone',
        render: () => <LiveApp services={() => seededServices()} screen={() => GAMES_SCREEN} />,
      },
    ],
  },
  Import: {
    title: 'Import',
    summary: 'Reprendre un historique depuis un fichier JSON au format d’import de Scoreo.',
    states: [
      {
        name: 'Avant le choix du fichier',
        frame: 'phone',
        render: () => <LiveApp services={() => seededServices()} screen={() => IMPORT_SCREEN} />,
      },
    ],
  },
  Sync: {
    title: 'Synchronisation',
    summary: 'Sauvegarder et retrouver ses parties sur Google Drive, d’un appareil à l’autre.',
    states: [
      {
        name: 'Non connecté',
        frame: 'phone',
        render: () => <LiveApp services={() => seededServices()} screen={() => SYNC_SCREEN} />,
      },
      {
        name: 'Connecté à Google Drive',
        frame: 'phone',
        render: () => (
          <LiveApp
            services={() => seededServices({ sync: 'connected' })}
            screen={() => SYNC_SCREEN}
          />
        ),
      },
    ],
  },
}

/** In the order a player meets them. */
export const APP_SCREENS: AppScreen[] = Object.entries(BY_TYPE).map(([type, screen]) => ({
  type,
  ...screen,
}))
