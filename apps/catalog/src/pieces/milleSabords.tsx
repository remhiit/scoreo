import { StatusLine } from '@scoreboards/design-system'
import {
  ModuleRoot,
  ScorePreview,
  ScoreTable,
  type ScoreTableProps,
} from '../../../../packages/module-mille-sabords/src/design'
import type { PieceModule } from '../shell/types'
import { DieCounterDemo } from './demos'

const PLAYERS = [
  { key: 'camille', name: 'Camille' },
  { key: 'yanis', name: 'Yanis' },
  { key: 'lea', name: 'Léa' },
]

const TABLE = {
  cornerLabel: 'Tour',
  players: PLAYERS,
  currentIndex: 1,
  emptyLabel: 'Aucun coup joué pour l’instant.',
  totalLabel: 'Total',
}

const ROUNDS: ScoreTableProps['rounds'] = [
  {
    label: 'Tour 1',
    cells: [
      { text: '1100', title: '3× 💎 = 300 · Coffre plein = 500' },
      { text: '0', tone: 'zero' },
      { text: '400' },
    ],
  },
  {
    label: 'Tour 2',
    cells: [
      { text: '-500', tone: 'negative', title: 'Défaite au combat' },
      { text: '☠️ -300', tone: 'island', title: 'Île de la tête de mort' },
      { text: '2000' },
    ],
  },
  { label: 'Tour 3', cells: [{ text: '3800' }, { text: '600' }, { text: '1500' }] },
]

const TOTALS: ScoreTableProps['totals'] = [
  { value: 4400, tone: 'leading' },
  { value: 300 },
  { value: 3900 },
]

export const MILLE_SABORDS_PIECES: PieceModule = {
  id: 'module-mille-sabords',
  title: '1000 Sabords',
  Root: ModuleRoot,
  pieces: [
    {
      id: 'piece-mille-sabords-die-counter',
      title: 'Compteur de dés',
      covers: ['DieCounter'],
      usage:
        'Une face des huit dés, son nom et combien de dés la montrent. Le compteur se lit, il ne se tape pas : les joueurs le montent et le descendent en triant les dés.',
      variants: [{ name: 'Tri des dés', render: () => <DieCounterDemo /> }],
    },
    {
      id: 'piece-mille-sabords-score-preview',
      title: 'Aperçu du score',
      covers: ['ScorePreview'],
      usage:
        'Ce que vaut la main en cours, avant que les joueurs l’enregistrent, avec le détail du calcul. Le `tone` teinte la pastille : des points, rien, une perte, ou une île de la tête de mort.',
      variants: [
        {
          name: 'Points',
          render: () => (
            <ScorePreview
              score="1100 pts"
              tone="positive"
              details={'3× 💎 = 300\nBrelan de singes = 100\nCoffre plein = 500'}
            />
          ),
        },
        {
          name: 'Rien',
          render: () => <ScorePreview score="0 pts" tone="zero" details="Aucune combinaison" />,
        },
        {
          name: 'Défaite au combat',
          render: () => (
            <ScorePreview
              score="-500 pts"
              tone="negative"
              details="💀 3 cranes — Défaite au combat! -500 pts"
            />
          ),
        },
        {
          name: 'Île de la tête de mort',
          render: () => (
            <ScorePreview
              score="☠️ -500 pts"
              tone="island"
              details={'☠️ Île de la Tête de Mort!\n5 💀 × 100 = -500 pts par adversaire'}
            >
              <StatusLine tone="danger">Chaque adversaire perd 500 points</StatusLine>
            </ScorePreview>
          ),
        },
      ],
    },
    {
      id: 'piece-mille-sabords-score-table',
      title: 'Tableau des scores',
      covers: ['ScoreTable'],
      usage:
        'Une colonne par joueur, une ligne par tour, les totaux en pied. Le joueur dont c’est le tour est souligné ; une case se teinte selon le coup (rien, perte, île) et un total selon la course (en tête, au-delà des 6000).',
      variants: [
        {
          name: 'Partie en cours',
          render: () => <ScoreTable {...TABLE} rounds={ROUNDS} totals={TOTALS} />,
        },
        {
          name: 'Au-delà des 6000',
          render: () => (
            <ScoreTable
              {...TABLE}
              currentIndex={2}
              rounds={[
                ...ROUNDS,
                { label: 'Tour 4', cells: [{ text: '2000' }, { text: '400' }, { text: '' }] },
              ]}
              totals={[{ value: 6400, tone: 'over' }, { value: 700 }, { value: 3900 }]}
            />
          ),
        },
        {
          name: 'Aucun coup joué',
          render: () => (
            <ScoreTable
              {...TABLE}
              currentIndex={0}
              rounds={[]}
              totals={[{ value: 0 }, { value: 0 }, { value: 0 }]}
            />
          ),
        },
      ],
    },
  ],
}
