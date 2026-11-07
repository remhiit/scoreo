import {
  Badge,
  BulletList,
  Button,
  ButtonRow,
  DetailList,
  DetailRow,
  EmptyState,
  HistoryCell,
  List,
  ListRow,
  Score,
  StatRow,
} from '@scoreboards/design-system'
import type { Story } from '../shell/types'
import {
  SelectableList,
  SegmentedDemo,
  TabsDemo,
  FormRowDemo,
  FilterDemo,
  EditableCell,
  StandingsCardPair,
  StatusLineSet,
} from './molecules.demos'

const noop = () => {}

export const MOLECULE_STORIES: Story[] = [
  {
    id: 'list-row',
    title: 'ListRow et List',
    layer: 'molecules',
    covers: ['ListRow', 'List'],
    usage:
      'La ligne qui porte l’app : titre, sous-titre, joueurs, date, badge. `selectable` teinte toute la ligne ; les actions carrées collent au bord.',
    variants: [
      {
        name: 'Partie avec actions',
        render: () => (
          <List>
            <ListRow
              title="Skyjo"
              subtitle="Gagnée par Alice"
              players="Alice, Bruno, Chloé, David"
              date="6 nov. 2026"
              badge={<Badge tone="success">Terminée</Badge>}
              actions={[
                { icon: 'edit', label: 'Modifier', onClick: noop },
                { icon: 'delete', label: 'Supprimer', onClick: noop, tone: 'danger' },
              ]}
            />
            <ListRow
              title="Tarot"
              subtitle="Manche 4 en cours"
              date="5 nov. 2026"
              badge={<Badge tone="warning">Brouillon</Badge>}
              highlighted
            />
          </List>
        ),
      },
      { name: 'Sélection de joueurs', render: () => <SelectableList /> },
    ],
  },
  {
    id: 'standings-card',
    title: 'StandingsCard',
    layer: 'molecules',
    covers: ['StandingsCard'],
    usage: 'Rang, nom, total et écart ; le meneur (`lead`) est bordé de l’accent.',
    variants: [
      {
        name: 'Meneur et suivant',
        render: () => <StandingsCardPair />,
      },
    ],
  },
  {
    id: 'stat-row',
    title: 'StatRow',
    layer: 'molecules',
    covers: ['StatRow'],
    usage:
      'Ligne de classement : nom, bilan, jauge, valeur, ELO accentué. `card` seule, `line` compacte dans un `Panel`.',
    variants: [
      {
        name: 'card',
        render: () => (
          <StatRow
            title="Alice"
            subtitle="18 victoires sur 42"
            rate={18 / 42}
            rateLabel="43 % de victoires"
            value="43 %"
            score="1 284"
            trailing={<Badge tone="accent">1er</Badge>}
          />
        ),
      },
      {
        name: 'line',
        render: () => (
          <StatRow
            variant="line"
            title="Bruno"
            subtitle="5 victoires sur 17"
            rate={5 / 17}
            rateLabel="29 % de victoires"
            value="29 %"
          />
        ),
      },
    ],
  },
  {
    id: 'history-cell',
    title: 'HistoryCell',
    layer: 'molecules',
    covers: ['HistoryCell'],
    usage: 'Nom et score sur une grille de deux colonnes, en lecture ou éditable.',
    variants: [
      {
        name: 'Lecture',
        render: () => (
          <HistoryCell name="Alice">
            <Score size="sm">12</Score>
          </HistoryCell>
        ),
      },
      { name: 'Éditable', render: () => <EditableCell /> },
    ],
  },
  {
    id: 'segmented',
    title: 'SegmentedControl, Tabs et TabPanel',
    layer: 'molecules',
    covers: ['SegmentedControl', 'Tabs', 'TabPanel'],
    usage:
      '`SegmentedControl` bascule une vue dans l’écran ; `Tabs` filtre une liste, et `TabPanel` est la carte que l’onglet montre.',
    variants: [
      { name: 'SegmentedControl', render: () => <SegmentedDemo /> },
      { name: 'Tabs et TabPanel', render: () => <TabsDemo /> },
    ],
  },
  {
    id: 'form-row',
    title: 'FormRow et ButtonRow',
    layer: 'molecules',
    covers: ['FormRow', 'ButtonRow'],
    usage:
      '`FormRow` : un champ et son bouton d’envoi. `ButtonRow` : des boutons qui partagent une ligne.',
    variants: [
      { name: 'FormRow', render: () => <FormRowDemo /> },
      {
        name: 'ButtonRow fill',
        render: () => (
          <ButtonRow>
            <Button variant="secondary" onClick={noop}>
              Annuler
            </Button>
            <Button onClick={noop}>Enregistrer</Button>
          </ButtonRow>
        ),
      },
      {
        name: 'ButtonRow end',
        render: () => (
          <ButtonRow align="end">
            <Button variant="ghost" onClick={noop}>
              Plus tard
            </Button>
            <Button onClick={noop}>Fusionner</Button>
          </ButtonRow>
        ),
      },
    ],
  },
  {
    id: 'detail-list',
    title: 'DetailList et DetailRow',
    layer: 'molecules',
    covers: ['DetailList', 'DetailRow'],
    usage: 'Paires libellé / valeur, encadrées ou non (`boxed`).',
    variants: [
      {
        name: 'boxed',
        render: () => (
          <DetailList boxed>
            <DetailRow label="Parties" value="128" />
            <DetailRow label="Dernière synchro" value="2026-11-06 18:04" mono />
          </DetailList>
        ),
      },
    ],
  },
  {
    id: 'status-line',
    title: 'StatusLine',
    layer: 'molecules',
    covers: ['StatusLine'],
    usage:
      'Le résultat d’une opération : succès, avertissement, erreur ou information, avec ses détails.',
    variants: [
      {
        name: 'Tons',
        render: () => <StatusLineSet />,
      },
    ],
  },
  {
    id: 'filter-bar',
    title: 'FilterBar',
    layer: 'molecules',
    covers: ['FilterBar'],
    usage: 'Un libellé et une liste compacte au-dessus d’une liste filtrée.',
    variants: [{ name: 'Filtre par jeu', render: () => <FilterDemo /> }],
  },
  {
    id: 'empty-state',
    title: 'EmptyState',
    layer: 'molecules',
    covers: ['EmptyState'],
    usage: 'Ce qui manque et comment le remplir, à la place d’une liste vide.',
    variants: [
      {
        name: 'Historique vide',
        render: () => (
          <EmptyState icon="history" title="Aucune partie enregistrée">
            Lancez une partie depuis l’accueil : elle apparaîtra ici.
          </EmptyState>
        ),
      },
    ],
  },
  {
    id: 'bullet-list',
    title: 'BulletList',
    layer: 'molecules',
    covers: ['BulletList'],
    usage: 'Les éléments qu’une action destructrice touche, un par ligne.',
    variants: [
      {
        name: 'Parties supprimées',
        render: () => <BulletList items={['Skyjo du 6 nov. 2026', 'Tarot du 2 nov. 2026']} />,
      },
    ],
  },
]
