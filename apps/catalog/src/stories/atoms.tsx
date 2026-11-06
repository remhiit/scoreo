import {
  Badge,
  Button,
  Delta,
  ICON_NAMES,
  Icon,
  Meter,
  Rank,
  Score,
  Stack,
  Text,
} from '@scoreboards/design-system'
import type { Story } from '../shell/types'
import {
  TextInputDemo,
  DateInputDemo,
  NumberInputDemo,
  NumberFieldDemo,
  SelectDemo,
  CheckboxDemo,
  ChipDemo,
  SwatchDemo,
} from './atoms.demos'

const noop = () => {}

export const ATOM_STORIES: Story[] = [
  {
    id: 'button',
    title: 'Button',
    layer: 'atoms',
    covers: ['Button'],
    usage:
      'Une seule action primaire par écran. `danger` pour ce qui détruit, `ghost` pour l’action discrète, `pill` pour l’unique action flottante.',
    variants: [
      {
        name: 'Variantes',
        render: () => (
          <Stack direction="row" gap={2} wrap align="center">
            <Button onClick={noop}>Nouvelle partie</Button>
            <Button variant="secondary" onClick={noop}>
              Annuler
            </Button>
            <Button variant="ghost" onClick={noop}>
              Plus tard
            </Button>
            <Button variant="danger" icon="delete" onClick={noop}>
              Supprimer
            </Button>
            <Button disabled onClick={noop}>
              Indisponible
            </Button>
          </Stack>
        ),
      },
      {
        name: 'Tailles et formes',
        render: () => (
          <Stack direction="row" gap={2} wrap align="center">
            <Button size="sm" onClick={noop}>
              Petit
            </Button>
            <Button size="md" onClick={noop}>
              Moyen
            </Button>
            <Button size="lg" onClick={noop}>
              Grand
            </Button>
            <Button shape="pill" icon="plus" onClick={noop}>
              Ajouter une manche
            </Button>
            <Button icon="edit" label="Renommer" variant="secondary" onClick={noop} />
          </Stack>
        ),
      },
      {
        name: 'Pleine largeur',
        render: () => (
          <Button width="full" icon="play" onClick={noop}>
            Lancer la partie
          </Button>
        ),
      },
    ],
  },
  {
    id: 'icon',
    title: 'Icon',
    layer: 'atoms',
    covers: ['Icon'],
    usage:
      'Jeu fermé d’icônes nommées : une icône manquante s’ajoute à `icons.ts`, jamais d’import `lucide-react` ni d’emoji.',
    variants: [
      {
        name: `Les ${ICON_NAMES.length} icônes`,
        render: () => (
          <Stack direction="row" gap={4} wrap>
            {ICON_NAMES.map((name) => (
              <Stack key={name} gap={1} align="center">
                <Icon name={name} />
                <Text variant="caption">{name}</Text>
              </Stack>
            ))}
          </Stack>
        ),
      },
      {
        name: 'Tailles et tons',
        render: () => (
          <Stack direction="row" gap={4} align="center">
            <Icon name="trophy" size="sm" />
            <Icon name="trophy" size="md" />
            <Icon name="trophy" size="lg" />
            <Icon name="trophy" size="lg" tone="accent" />
            <Icon name="trophy" size="lg" tone="muted" />
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'text',
    title: 'Text',
    layer: 'atoms',
    covers: ['Text'],
    usage: 'Tout texte passe par `Text` : la variante dit le rôle, jamais la taille ou la couleur.',
    variants: [
      {
        name: 'Variantes',
        render: () => (
          <Stack gap={2}>
            <Text variant="title">title — Historique</Text>
            <Text variant="heading">heading — Partie du 6 novembre</Text>
            <Text variant="strong">strong — Alice mène de 12 points</Text>
            <Text>body — Quatre joueurs, trois manches jouées.</Text>
            <Text variant="muted">muted — Dernière partie il y a 2 jours</Text>
            <Text variant="hint">hint — Glissez un fichier JSON ici</Text>
            <Text variant="label">label — Joueurs</Text>
            <Text variant="caption">caption — v1.1</Text>
            <Text variant="mono">mono — 2026-11-06</Text>
            <Text variant="success">success — Synchronisé</Text>
            <Text variant="warning">warning — Hors ligne</Text>
            <Text variant="error">error — Fichier illisible</Text>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'stack',
    title: 'Stack',
    layer: 'atoms',
    covers: ['Stack'],
    usage:
      'La primitive de mise en page : direction, écart sur l’échelle d’espacement, alignement. Jamais de marge.',
    variants: [
      {
        name: 'Ligne, écart 2, justifiée',
        render: () => (
          <Stack direction="row" gap={2} justify="between" align="center">
            <Text variant="strong">Alice</Text>
            <Score>128</Score>
          </Stack>
        ),
      },
      {
        name: 'Colonne, écart 4',
        render: () => (
          <Stack gap={4}>
            <Text variant="heading">Manche 3</Text>
            <Text variant="muted">Bruno a fermé la manche.</Text>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'text-input',
    title: 'TextInput',
    layer: 'atoms',
    covers: ['TextInput'],
    usage: 'Champ texte avec libellé ; l’erreur remplace l’aide et est annoncée.',
    variants: [
      { name: 'Avec aide', render: () => <TextInputDemo /> },
      { name: 'En erreur', render: () => <TextInputDemo invalid /> },
    ],
  },
  {
    id: 'date-input',
    title: 'DateInput',
    layer: 'atoms',
    covers: ['DateInput'],
    usage: 'Date native au format AAAA-MM-JJ, empilée ou en ligne.',
    variants: [
      { name: 'Empilée', render: () => <DateInputDemo layout="stacked" /> },
      { name: 'En ligne', render: () => <DateInputDemo layout="inline" /> },
    ],
  },
  {
    id: 'number-input',
    title: 'NumberInput',
    layer: 'atoms',
    covers: ['NumberInput'],
    usage:
      'Valeur numérique : `stepper` (− valeur +) pour les petits écarts, `cell` dans une grille.',
    variants: [
      { name: 'stepper', render: () => <NumberInputDemo mode="stepper" /> },
      { name: 'plain', render: () => <NumberInputDemo mode="plain" /> },
      { name: 'cell', render: () => <NumberInputDemo mode="cell" /> },
    ],
  },
  {
    id: 'number-field',
    title: 'NumberField',
    layer: 'atoms',
    covers: ['NumberField'],
    usage: 'Champ numérique piloté comme du texte : vide et « - » survivent pendant la saisie.',
    variants: [
      { name: 'Cellule', render: () => <NumberFieldDemo /> },
      { name: 'Invalide', render: () => <NumberFieldDemo invalid /> },
    ],
  },
  {
    id: 'select',
    title: 'Select',
    layer: 'atoms',
    covers: ['Select'],
    usage: 'Liste native au chevron thémé ; `sm` dans une barre de filtre.',
    variants: [
      { name: 'md', render: () => <SelectDemo size="md" /> },
      { name: 'sm', render: () => <SelectDemo size="sm" /> },
    ],
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    layer: 'atoms',
    covers: ['Checkbox'],
    usage: 'Le libellé entier est la cible tactile de 44 px.',
    variants: [{ name: 'Cochée', render: () => <CheckboxDemo /> }],
  },
  {
    id: 'badge',
    title: 'Badge',
    layer: 'atoms',
    covers: ['Badge'],
    usage: 'Un statut court sur une ligne ; le ton porte le sens, le libellé optionnel le précise.',
    variants: [
      {
        name: 'Tons',
        render: () => (
          <Stack direction="row" gap={2} wrap>
            <Badge>neutral</Badge>
            <Badge tone="accent">accent</Badge>
            <Badge tone="solid">solid</Badge>
            <Badge tone="success">Gagné</Badge>
            <Badge tone="warning">Brouillon</Badge>
            <Badge tone="danger">Conflit</Badge>
            <Badge tone="accent" label="ELO">
              1 284
            </Badge>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'score',
    title: 'Score, Rank, Delta',
    layer: 'atoms',
    covers: ['Score', 'Rank', 'Delta'],
    usage: 'Chiffres tabulaires à chasse fixe, pour que les colonnes de scores s’alignent.',
    variants: [
      {
        name: 'Tailles et tons',
        render: () => (
          <Stack direction="row" gap={4} align="baseline" wrap>
            <Score size="sm">12</Score>
            <Score>128</Score>
            <Score size="lg" tone="accent">
              1 284
            </Score>
            <Score size="xl">97</Score>
            <Score tone="muted">-3</Score>
            <Rank>1</Rank>
            <Delta>+14</Delta>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'meter',
    title: 'Meter',
    layer: 'atoms',
    covers: ['Meter'],
    usage: 'Taux de victoire entre 0 et 1, avec un libellé pour les lecteurs d’écran.',
    variants: [
      {
        name: '0 %, 42 %, 100 %',
        render: () => (
          <Stack gap={3}>
            <Meter value={0} label="0 % de victoires" />
            <Meter value={0.42} label="42 % de victoires" />
            <Meter value={1} label="100 % de victoires" />
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'chip',
    title: 'Chip',
    layer: 'atoms',
    covers: ['Chip'],
    usage: 'Un mot parmi quelques-uns (thème, langue) ; l’état est annoncé par `aria-pressed`.',
    variants: [{ name: 'Langues', render: () => <ChipDemo /> }],
  },
  {
    id: 'swatch',
    title: 'Swatch',
    layer: 'atoms',
    covers: ['Swatch'],
    usage: 'Pastille d’accent de 26 px dans un bouton de 44 px.',
    variants: [{ name: 'Les 14 accents', render: () => <SwatchDemo /> }],
  },
]
