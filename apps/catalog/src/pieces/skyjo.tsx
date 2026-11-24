import { Text } from '@scoreboards/design-system'
import { ModuleRoot, SkyjoTable, SkyjoWinner } from '../../../../packages/module-skyjo/src/design'
import type { PieceModule } from '../shell/types'

const PLAYERS = ['Camille', 'Yanis', 'Léa', 'Malo']

const LABELS = {
  totalLabel: 'Total',
  emptyLabel: 'Aucune manche jouée pour l’instant.',
  doubledLabel: 'Doublé',
}

export const SKYJO_PIECES: PieceModule = {
  id: 'module-skyjo',
  title: 'Skyjo',
  Root: ModuleRoot,
  pieces: [
    {
      id: 'piece-skyjo-table',
      title: 'Tableau des manches',
      covers: ['SkyjoTable'],
      usage:
        'Le relevé des manches, une colonne par joueur, avec les totaux cumulés en pied. Le score doublé de celui qui a fini sans être le plus bas se lit comme une pénalité ; le plus petit total encore en jeu est en tête.',
      variants: [
        {
          name: 'Partie en cours',
          render: () => (
            <SkyjoTable
              {...LABELS}
              playerNames={PLAYERS}
              rows={[
                {
                  label: 'Manche 1',
                  cells: [
                    { text: '12' },
                    { text: '-2' },
                    { text: '20 ×2', doubled: true },
                    { text: '8' },
                  ],
                },
                {
                  label: 'Manche 2',
                  cells: [{ text: '5' }, { text: '17' }, { text: '3' }, { text: '24' }],
                },
              ]}
              totals={[
                { value: 17, leading: false },
                { value: 15, leading: true },
                { value: 43, leading: false },
                { value: 32, leading: false },
              ]}
            />
          ),
        },
        {
          name: 'Aucune manche',
          render: () => (
            <SkyjoTable
              {...LABELS}
              playerNames={PLAYERS}
              rows={[]}
              totals={PLAYERS.map(() => ({ value: 0, leading: false }))}
            />
          ),
        },
      ],
    },
    {
      id: 'piece-skyjo-winner',
      title: 'Bannière du vainqueur',
      covers: ['SkyjoWinner'],
      usage:
        'La fin de partie : le trophée, puis ce qui annonce le vainqueur, composé du design system. Le classement complet suit, hors de la bannière.',
      variants: [
        {
          name: 'Fin de partie',
          render: () => (
            <SkyjoWinner>
              <Text variant="title">Yanis gagne !</Text>
              <Text variant="mono">61 points</Text>
            </SkyjoWinner>
          ),
        },
      ],
    },
  ],
}
