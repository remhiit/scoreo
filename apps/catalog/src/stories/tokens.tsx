import {
  AccentSpecimen,
  PaletteSpecimen,
  SemanticSpecimen,
  ShapeSpecimen,
  SpacingSpecimen,
  TypeSpecimen,
} from '../shell/Tokens'
import type { Story } from '../shell/types'

export const TOKEN_STORIES: Story[] = [
  {
    id: 'palette',
    title: 'Palette Catppuccin',
    layer: 'tokens',
    covers: [],
    usage:
      'Quatre thèmes, choisis par `data-theme` sur <html>. Valeurs brutes : seule la couche sémantique les lit.',
    variants: [{ name: 'Les quatre thèmes', render: () => <PaletteSpecimen /> }],
  },
  {
    id: 'semantic',
    title: 'Couleurs sémantiques',
    layer: 'tokens',
    covers: [],
    usage:
      'Les seules couleurs qu’un composant a le droit de lire. Affichées dans le thème choisi en haut de page.',
    variants: [{ name: 'Thème courant', render: () => <SemanticSpecimen /> }],
  },
  {
    id: 'accents',
    title: 'Accents',
    layer: 'tokens',
    covers: [],
    usage:
      'L’utilisateur choisit l’accent (`data-accent`), qui devient --color-primary dans tout le système.',
    variants: [{ name: '14 teintes', render: () => <AccentSpecimen /> }],
  },
  {
    id: 'typography',
    title: 'Typographie',
    layer: 'tokens',
    covers: [],
    usage:
      'Polices système uniquement (app hors ligne) ; chiffres en tabulaire pour que les scores s’alignent.',
    variants: [{ name: 'Échelle et graisses', render: () => <TypeSpecimen /> }],
  },
  {
    id: 'spacing',
    title: 'Espacements',
    layer: 'tokens',
    covers: [],
    usage:
      'Une grille de 4 px. `Stack` n’accepte que ces pas ; 44 px est la cible tactile minimale.',
    variants: [{ name: 'Échelle', render: () => <SpacingSpecimen /> }],
  },
  {
    id: 'shape',
    title: 'Rayons, ombres et mouvement',
    layer: 'tokens',
    covers: [],
    usage: 'Trois rayons et une pilule, trois ombres, trois durées sur une seule courbe.',
    variants: [{ name: 'Formes', render: () => <ShapeSpecimen /> }],
  },
]
