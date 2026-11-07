import {
  ActionBar,
  AppHeader,
  Banner,
  BulletList,
  Button,
  ButtonRow,
  Comparison,
  ComparisonCard,
  Dialog,
  DropZone,
  HistoryCell,
  ModuleGameActions,
  Panel,
  RoundCard,
  Score,
  SideMenu,
  StandingsCard,
  StandingsGrid,
  StatRow,
  Text,
} from '@scoreboards/design-system'
import type { Story } from '../shell/types'
import { ThemePickerDemo, SheetDemo } from './organisms.demos'

const noop = () => {}
const GAME_ACTION_LABELS = {
  undo: 'Annuler la dernière manche',
  abandon: 'Abandonner',
  save: 'Enregistrer la partie',
}

export const ORGANISM_STORIES: Story[] = [
  {
    id: 'app-header',
    title: 'AppHeader',
    layer: 'organisms',
    covers: ['AppHeader'],
    usage: 'En-tête fixe : retour (ou rien), titre centré, menu burger.',
    variants: [
      {
        name: 'Avec retour et menu',
        frame: 'phone',
        render: () => (
          <AppHeader
            title="Historique"
            back={{ label: 'Retour', onClick: noop }}
            menu={{ label: 'Menu', onClick: noop }}
          />
        ),
      },
    ],
  },
  {
    id: 'standings-grid',
    title: 'StandingsGrid',
    layer: 'organisms',
    covers: ['StandingsGrid'],
    usage: 'Deux colonnes de cartes de classement, en tête d’une partie.',
    variants: [
      {
        name: 'Quatre joueurs',
        render: () => (
          <StandingsGrid ariaLabel="Classement">
            <StandingsCard rank={1} name="Alice" total={<Score size="lg">42</Score>} lead />
            <StandingsCard rank={2} name="Chloé" total={<Score size="lg">51</Score>} delta="+9" />
            <StandingsCard rank={3} name="Bruno" total={<Score size="lg">57</Score>} delta="+15" />
            <StandingsCard rank={4} name="David" total={<Score size="lg">80</Score>} delta="+38" />
          </StandingsGrid>
        ),
      },
    ],
  },
  {
    id: 'round-card',
    title: 'RoundCard',
    layer: 'organisms',
    covers: ['RoundCard'],
    usage: 'Une manche passée ; les cellules passent à la ligne vers le bas.',
    variants: [
      {
        name: 'Manche 3',
        render: () => (
          <RoundCard
            title="Manche 3"
            trailing={
              <Button
                size="sm"
                variant="ghost"
                icon="edit"
                label="Modifier la manche"
                onClick={noop}
              />
            }
          >
            {[
              ['Alice', 3],
              ['Bruno', 12],
              ['Chloé', -2],
              ['David', 21],
            ].map(([name, score]) => (
              <HistoryCell key={name} name={String(name)}>
                <Score size="sm">{score}</Score>
              </HistoryCell>
            ))}
          </RoundCard>
        ),
      },
    ],
  },
  {
    id: 'panel',
    title: 'Panel',
    layer: 'organisms',
    covers: ['Panel'],
    usage: 'Section titrée sur une carte : face-à-face des stats, trophées du Hall of Fame.',
    variants: [
      {
        name: 'Face-à-face',
        render: () => (
          <Panel
            title="Alice contre Bruno"
            description="Sur 12 parties de Skyjo"
            trailing={<Text variant="muted">2026</Text>}
          >
            <StatRow
              variant="line"
              title="Alice"
              rate={8 / 12}
              rateLabel="67 % de victoires"
              value="8"
            />
            <StatRow
              variant="line"
              title="Bruno"
              rate={4 / 12}
              rateLabel="33 % de victoires"
              value="4"
            />
          </Panel>
        ),
      },
    ],
  },
  {
    id: 'banner',
    title: 'Banner',
    layer: 'organisms',
    covers: ['Banner'],
    usage: 'Conteneur accentué pour les étapes de prise en main ou la reprise d’une partie.',
    variants: [
      {
        name: 'Prise en main',
        render: () => (
          <Banner
            title="Bienvenue sur Scoreo"
            steps={['Ajoutez vos joueurs', 'Choisissez un jeu', 'Comptez les points']}
          />
        ),
      },
      {
        name: 'Reprise',
        render: () => (
          <Banner
            title="Partie de Tarot en cours"
            action={{ label: 'Reprendre', icon: 'play', onClick: noop }}
          >
            Manche 4, commencée il y a 20 minutes.
          </Banner>
        ),
      },
    ],
  },
  {
    id: 'drop-zone',
    title: 'DropZone',
    layer: 'organisms',
    covers: ['DropZone'],
    usage: 'Cible de fichier en pointillés ; rend le `File` choisi.',
    variants: [
      {
        name: 'Import JSON',
        render: () => (
          <DropZone
            label="Déposez un fichier JSON ou touchez pour choisir"
            accept="application/json"
            onFile={noop}
          />
        ),
      },
    ],
  },
  {
    id: 'comparison',
    title: 'Comparison et ComparisonCard',
    layer: 'organisms',
    covers: ['Comparison', 'ComparisonCard'],
    usage: 'Deux cartes symétriques, pour trancher un conflit de synchronisation.',
    variants: [
      {
        name: 'Conflit de synchro',
        render: () => (
          <Comparison>
            <ComparisonCard title="Cet appareil" stats={['128 parties', 'Modifié le 6 nov.']} />
            <ComparisonCard title="Google Drive" stats={['126 parties', 'Modifié le 4 nov.']} />
          </Comparison>
        ),
      },
    ],
  },
  {
    id: 'side-menu',
    title: 'SideMenu',
    layer: 'organisms',
    covers: ['SideMenu'],
    usage: 'Navigation qui glisse depuis le bord, ouverte par le burger de l’en-tête.',
    variants: [
      {
        name: 'Ouvert',
        frame: 'phone',
        render: () => (
          <SideMenu
            open
            onClose={noop}
            closeLabel="Fermer"
            items={[
              { icon: 'home', label: 'Accueil', onClick: noop },
              { icon: 'history', label: 'Historique', onClick: noop },
              { icon: 'stats', label: 'Statistiques', onClick: noop },
              { icon: 'trophy', label: 'Hall of Fame', onClick: noop },
              { icon: 'games', label: 'Jeux', onClick: noop },
              { icon: 'upload', label: 'Importer', onClick: noop },
              { icon: 'cloud', label: 'Synchronisation', onClick: noop },
              { icon: 'palette', label: 'Thème', onClick: noop },
            ]}
          />
        ),
      },
    ],
  },
  {
    id: 'dialog',
    title: 'Dialog',
    layer: 'organisms',
    covers: ['Dialog'],
    usage:
      'Dialogue centré : titre, corps, pied d’actions. Pour une suppression, liste ce qui part.',
    variants: [
      {
        name: 'Suppression',
        frame: 'phone',
        render: () => (
          <Dialog
            open
            title="Supprimer Bruno ?"
            onClose={noop}
            closeLabel="Fermer"
            actions={
              <ButtonRow>
                <Button variant="secondary" onClick={noop}>
                  Annuler
                </Button>
                <Button variant="danger" onClick={noop}>
                  Supprimer
                </Button>
              </ButtonRow>
            }
          >
            <Text block>Ses 2 parties seront aussi supprimées :</Text>
            <BulletList items={['Skyjo du 6 nov. 2026', 'Tarot du 2 nov. 2026']} />
          </Dialog>
        ),
      },
    ],
  },
  {
    id: 'sheet',
    title: 'Sheet et SheetRow',
    layer: 'organisms',
    covers: ['Sheet', 'SheetRow'],
    usage: 'Panneau du bas qui laisse le contexte lisible : la saisie d’une manche.',
    variants: [{ name: 'Saisie de manche', frame: 'phone', render: () => <SheetDemo /> }],
  },
  {
    id: 'action-bar',
    title: 'ActionBar',
    layer: 'organisms',
    covers: ['ActionBar'],
    usage:
      'Barre du bas : `center` pour une pilule unique, `stack` pour une action pleine au-dessus des secondaires.',
    variants: [
      {
        name: 'center',
        frame: 'phone',
        render: () => (
          <ActionBar layout="center">
            <Button shape="pill" icon="plus" onClick={noop}>
              Ajouter une manche
            </Button>
          </ActionBar>
        ),
      },
      {
        name: 'stack',
        frame: 'phone',
        render: () => (
          <ActionBar>
            <Button width="full" icon="play" onClick={noop}>
              Lancer la partie
            </Button>
            <ButtonRow>
              <Button variant="secondary" onClick={noop}>
                Tout sélectionner
              </Button>
              <Button variant="secondary" onClick={noop}>
                Aucun
              </Button>
            </ButtonRow>
          </ActionBar>
        ),
      },
    ],
  },
  {
    id: 'module-game-actions',
    title: 'ModuleGameActions',
    layer: 'organisms',
    covers: ['ModuleGameActions'],
    usage:
      'Actions de partie d’un module de comptage : annuler et abandonner pendant la partie, enregistrer dans la barre du bas une fois terminée.',
    variants: [
      {
        name: 'playing',
        render: () => (
          <ModuleGameActions
            phase="playing"
            labels={GAME_ACTION_LABELS}
            onUndo={noop}
            onAbandon={noop}
          />
        ),
      },
      {
        name: 'playing, fin à la main',
        render: () => (
          <ModuleGameActions
            phase="playing"
            labels={{ ...GAME_ACTION_LABELS, undo: 'Annuler le coup', end: 'Terminer la partie' }}
            onUndo={noop}
            onAbandon={noop}
            onEnd={noop}
          />
        ),
      },
      {
        name: 'finished',
        frame: 'phone',
        render: () => (
          <ModuleGameActions
            phase="finished"
            labels={GAME_ACTION_LABELS}
            onUndo={noop}
            onSave={noop}
          />
        ),
      },
    ],
  },
  {
    id: 'theme-picker',
    title: 'ThemePicker',
    layer: 'organisms',
    covers: ['ThemePicker'],
    usage: 'Puces de thème et pastilles d’accent.',
    variants: [{ name: 'Extrait de 4 accents', render: () => <ThemePickerDemo /> }],
  },
]
