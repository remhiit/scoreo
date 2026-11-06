import type { ReactNode } from 'react'
import {
  Badge,
  Button,
  HistoryCell,
  Icon,
  ImmersiveTemplate,
  NumberField,
  Panel,
  Score,
  Stack,
  StandingsCard,
  StandingsGrid,
  Text,
  WideLayout,
} from '@scoreboards/design-system'
import { ModuleGameActions } from './sketches/ModuleGameActions'

const noop = () => {}
const LABELS = {
  undo: 'Annuler la dernière manche',
  abandon: 'Abandonner',
  save: 'Enregistrer la partie',
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ImmersiveTemplate title={title} exit={{ label: 'Quitter', onClick: noop }}>
      <WideLayout>
        <Stack gap={4}>{children}</Stack>
      </WideLayout>
    </ImmersiveTemplate>
  )
}

function Scores() {
  return (
    <StandingsGrid ariaLabel="Classement">
      <StandingsCard rank="1." name="Alice" total="12 pts" lead />
      <StandingsCard rank="2." name="Bruno" total="27 pts" />
      <StandingsCard rank="3." name="Chloé" total="31 pts" />
    </StandingsGrid>
  )
}

function RoundEntry() {
  return (
    <Panel title="Manche 4">
      {['Alice', 'Bruno', 'Chloé'].map((name) => (
        <HistoryCell key={name} name={name}>
          <NumberField ariaLabel={`Score de ${name}`} value="" onChange={noop} />
        </HistoryCell>
      ))}
    </Panel>
  )
}

/** Skyjo during a game, as the module draws it today. */
export function PlayingToday() {
  return (
    <Frame title="Skyjo">
      <Stack direction="row" align="center" justify="between">
        <Text variant="heading">Skyjo</Text>
        <Badge>Manche 4</Badge>
      </Stack>
      <RoundEntry />
      <Scores />
      <Stack direction="row" gap={2} wrap>
        <Button variant="secondary" onClick={noop}>
          ↩ Annuler la dernière manche
        </Button>
        <Button variant="danger" onClick={noop}>
          🗑 Abandonner
        </Button>
      </Stack>
    </Frame>
  )
}

/** The same screen with the shared actions and the icon set. */
export function PlayingProposed() {
  return (
    <Frame title="Skyjo">
      <Stack direction="row" align="center" justify="between">
        <Text variant="heading">Skyjo</Text>
        <Badge>Manche 4</Badge>
      </Stack>
      <RoundEntry />
      <Scores />
      <ModuleGameActions
        phase="playing"
        onUndo={noop}
        onAbandon={noop}
        onSave={noop}
        labels={LABELS}
      />
    </Frame>
  )
}

/** Flip 7 once the game is over, as the module draws it today. */
export function FinishedToday() {
  return (
    <Frame title="Flip 7">
      <Stack direction="row" align="center" justify="between">
        <Text variant="heading">🃏 Flip 7</Text>
        <Badge tone="success">🏁 Partie terminée</Badge>
      </Stack>
      <Panel title="🏆 Alice remporte la partie !">
        <Text variant="mono">214 points</Text>
      </Panel>
      <Scores />
      <Stack direction="row" gap={2} wrap>
        <Button onClick={noop}>💾 Enregistrer la partie</Button>
        <Button variant="secondary" onClick={noop}>
          ↩ Annuler la dernière manche
        </Button>
      </Stack>
    </Frame>
  )
}

/** The end of game with icons from the set and the save action in the bottom bar. */
export function FinishedProposed() {
  return (
    <Frame title="Flip 7">
      <Stack direction="row" align="center" justify="between">
        <Text variant="heading">Flip 7</Text>
        <Badge tone="success">
          <Stack direction="row" gap={1} align="center">
            <Icon name="check" size="sm" />
            Partie terminée
          </Stack>
        </Badge>
      </Stack>
      <Panel
        title={
          <Stack direction="row" gap={2} align="center">
            <Icon name="trophy" tone="accent" />
            Alice remporte la partie !
          </Stack>
        }
      >
        <Score size="lg" tone="accent">
          214 points
        </Score>
      </Panel>
      <Scores />
      <ModuleGameActions
        phase="finished"
        onUndo={noop}
        onAbandon={noop}
        onSave={noop}
        labels={LABELS}
      />
    </Frame>
  )
}
