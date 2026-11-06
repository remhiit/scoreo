import {
  ActionBar,
  AppHeader,
  Badge,
  Button,
  Column,
  Columns,
  ImmersiveTemplate,
  List,
  ListRow,
  Panel,
  ScreenTemplate,
  Text,
  WideLayout,
} from '@scoreboards/design-system'
import type { Story } from '../shell/types'
import { Standings } from './templates.demos'

const noop = () => {}

export const TEMPLATE_STORIES: Story[] = [
  {
    id: 'screen-template',
    title: 'ScreenTemplate',
    layer: 'templates',
    covers: ['ScreenTemplate'],
    usage:
      'Le gabarit de tout écran hôte : en-tête, colonne de 600 px qui défile, barre d’actions optionnelle, superpositions (`Dialog`, `Sheet`).',
    variants: [
      {
        name: 'Liste qui défile',
        frame: 'phone',
        render: () => (
          <ScreenTemplate
            header={<AppHeader title="Historique" menu={{ label: 'Menu', onClick: noop }} />}
          >
            <List>
              {['Skyjo', 'Tarot', 'Flip 7', 'Skyjo', '1000 Sabords', 'Torī Valley'].map(
                (game, index) => (
                  <ListRow
                    key={index}
                    title={game}
                    subtitle={`Gagnée par ${['Alice', 'Bruno', 'Chloé'][index % 3]}`}
                    date={`${6 - index} nov. 2026`}
                  />
                ),
              )}
            </List>
          </ScreenTemplate>
        ),
      },
      {
        name: 'Liste et barre d’actions',
        frame: 'phone',
        render: () => (
          <ScreenTemplate
            header={<AppHeader title="Skyjo" back={{ label: 'Retour', onClick: noop }} />}
            actionBar={
              <ActionBar layout="center">
                <Button shape="pill" icon="plus" onClick={noop}>
                  Ajouter une manche
                </Button>
              </ActionBar>
            }
          >
            <Standings />
            <Text variant="muted">3 manches jouées</Text>
          </ScreenTemplate>
        ),
      },
    ],
  },
  {
    id: 'immersive-template',
    title: 'ImmersiveTemplate',
    layer: 'templates',
    covers: ['ImmersiveTemplate'],
    usage: 'Pour un module de comptage : une barre fine avec la sortie, le module occupe le reste.',
    variants: [
      {
        name: 'Module',
        frame: 'phone',
        render: () => (
          <ImmersiveTemplate title="Skyjo" exit={{ label: 'Quitter', onClick: noop }}>
            <WideLayout>
              <Standings />
            </WideLayout>
          </ImmersiveTemplate>
        ),
      },
    ],
  },
  {
    id: 'columns',
    title: 'WideLayout, Columns et Column',
    layer: 'templates',
    covers: ['WideLayout', 'Columns', 'Column'],
    usage:
      'La colonne large (1100 px) d’un module, et deux régions côte à côte à partir de 900 px de large, empilées en dessous.',
    variants: [
      {
        name: 'Tableau et tour en cours',
        render: () => (
          <WideLayout>
            <Columns>
              <Column label="Tableau des scores">
                <Standings />
              </Column>
              <Column label="Tour en cours">
                <Panel title="Tour de Chloé" trailing={<Badge tone="accent">Manche 3</Badge>}>
                  <Text>Comptez les cartes retournées.</Text>
                </Panel>
              </Column>
            </Columns>
          </WideLayout>
        ),
      },
    ],
  },
]
