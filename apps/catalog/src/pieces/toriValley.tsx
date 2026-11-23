import { Stack } from '@scoreboards/design-system'
import { ModuleRoot, ToriiBadge } from '../../../../packages/module-tori-valley/src/design'
import type { PieceModule } from '../shell/types'
import { VariantPickerDemo } from './demos'

const TORII = [
  { color: 'green', label: 'Vert' },
  { color: 'red', label: 'Rouge' },
  { color: 'blue', label: 'Bleu' },
  { color: 'yellow', label: 'Jaune' },
  { color: 'purple', label: 'Violet' },
] as const

export const TORI_VALLEY_PIECES: PieceModule = {
  id: 'module-tori-valley',
  title: 'Torī Valley',
  Root: ModuleRoot,
  pieces: [
    {
      id: 'piece-tori-valley-torii-badge',
      title: 'Pastille de Torī',
      covers: ['ToriiBadge'],
      usage:
        'Le nom d’une couleur de Torī, posé sur cette couleur : la palette du jeu, tirée des accents du design system. Une pastille par couleur, devant le compteur du joueur.',
      variants: [
        {
          name: 'Les cinq couleurs',
          render: () => (
            <Stack direction="row" gap={2} wrap>
              {TORII.map((torii) => (
                <ToriiBadge key={torii.color} color={torii.color}>
                  {torii.label}
                </ToriiBadge>
              ))}
            </Stack>
          ),
        },
      ],
    },
    {
      id: 'piece-tori-valley-variant-picker',
      title: 'Choix de variante',
      covers: ['VariantPicker'],
      usage:
        'La variante (A, B ou C) d’une carte Objectif, une par paysage : des boutons radio natifs dessinés en contrôle segmenté.',
      variants: [{ name: 'Bambou en A, Eau en C', render: () => <VariantPickerDemo /> }],
    },
  ],
}
