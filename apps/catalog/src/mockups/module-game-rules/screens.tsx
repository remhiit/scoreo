import {
  Button,
  ButtonRow,
  DetailList,
  DetailRow,
  Dialog,
  List,
  ListRow,
  Select,
  Stack,
  Text,
} from '@scoreboards/design-system'

const noop = () => {}

const WIN_CONDITIONS = [
  { value: 'HIGHEST_SCORE', label: 'Highest score' },
  { value: 'LOWEST_SCORE', label: 'Lowest score' },
  { value: 'MANUAL', label: 'Manual' },
]

const TIE_BREAKS = [
  { value: 'NONE', label: 'No tie-break' },
  { value: 'MANUAL_SELECTION', label: 'Manual selection' },
  { value: 'SECONDARY_SCORE', label: 'Secondary score' },
]

/** The Games screen list, Skyjo bound to its scoring module, Belote an ordinary game. */
function GameList({ moduleRowEditable }: { moduleRowEditable: boolean }) {
  const view = { icon: 'view' as const, label: 'Voir le détail', onClick: noop }
  const edit = { icon: 'edit' as const, label: 'Modifier', onClick: noop }
  const archive = {
    icon: 'delete' as const,
    label: 'Archiver',
    tone: 'danger' as const,
    onClick: noop,
  }
  return (
    <Stack gap={4}>
      <Text variant="heading">Types de jeu</Text>
      <List>
        <ListRow title="Belote" subtitle="Highest score" actions={[view, edit, archive]} />
        <ListRow
          title="Skyjo"
          subtitle={moduleRowEditable ? 'Lowest score' : 'Lowest score · 2 à 8 joueurs'}
          actions={moduleRowEditable ? [view, edit, archive] : [view, archive]}
        />
      </List>
    </Stack>
  )
}

/** Today: a game bound to a module is listed like any other, with an Edit action. */
export function ListToday() {
  return <GameList moduleRowEditable />
}

/** Proposed: no Edit action on a module's game, its player range in the subtitle. */
export function ListProposed() {
  return <GameList moduleRowEditable={false} />
}

/** Today: Skyjo's detail offers Edit, and shows no player range. */
export function DetailToday() {
  return (
    <Dialog
      open
      title="Skyjo"
      onClose={noop}
      closeLabel="Fermer"
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={noop}>
            Retour
          </Button>
          <Button onClick={noop}>Modifier</Button>
          <Button variant="danger" onClick={noop}>
            Archiver
          </Button>
        </ButtonRow>
      }
    >
      <DetailList>
        <DetailRow label="Condition de victoire" value="Lowest score" />
        <DetailRow label="Départage" value="No tie-break" />
      </DetailList>
    </Dialog>
  )
}

/**
 * Today: the edit form lets Skyjo switch to "Highest score" — the manifest
 * says lowest, so every winner, stat, Elo and trophy of its history flips.
 */
export function EditToday() {
  return (
    <Dialog
      open
      title="Modifier Skyjo"
      onClose={noop}
      closeLabel="Fermer"
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={noop}>
            Annuler
          </Button>
          <Button onClick={noop}>Enregistrer les modifications</Button>
        </ButtonRow>
      }
    >
      <Stack gap={3}>
        <Select
          label="Condition de victoire"
          value="HIGHEST_SCORE"
          options={WIN_CONDITIONS}
          onChange={noop}
        />
        <Select label="Règle de départage" value="NONE" options={TIE_BREAKS} onChange={noop} />
      </Stack>
    </Dialog>
  )
}

/**
 * Proposed: Skyjo's detail is read-only. Its rules come from the module — the
 * tie-break is the module's own — the player range is shown, and the only
 * action left besides closing is archiving.
 */
export function DetailProposed() {
  return (
    <Dialog
      open
      title="Skyjo"
      onClose={noop}
      closeLabel="Fermer"
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={noop}>
            Retour
          </Button>
          <Button variant="danger" onClick={noop}>
            Archiver
          </Button>
        </ButtonRow>
      }
    >
      <Stack gap={3}>
        <DetailList>
          <DetailRow label="Condition de victoire" value="Lowest score" />
          <DetailRow label="Départage" value="Décidé par le compteur de points" />
          <DetailRow label="Joueurs" value="2 à 8 joueurs" />
        </DetailList>
        <Text variant="muted" block>
          Les règles de Skyjo sont fixées par son compteur de points et s’appliquent à toutes ses
          parties. Elles ne se modifient pas.
        </Text>
      </Stack>
    </Dialog>
  )
}
