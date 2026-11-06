// Small stateful demos the molecules stories render. Kept apart from the stories
// so each file exports components only (fast refresh), or data only.
import { useState } from 'react'
import {
  Button,
  FilterBar,
  FormRow,
  HistoryCell,
  List,
  ListRow,
  NumberField,
  Score,
  SegmentedControl,
  Select,
  StandingsCard,
  StatusLine,
  TabPanel,
  Tabs,
  Text,
  TextInput,
} from '@scoreboards/design-system'

const noop = () => {}

export function SelectableList() {
  const [selected, setSelected] = useState<string[]>(['alice', 'chloe'])
  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]))
  return (
    <List>
      {[
        { id: 'alice', name: 'Alice', games: '42 parties' },
        { id: 'bruno', name: 'Bruno', games: '17 parties' },
        { id: 'chloe', name: 'Chloé', games: '35 parties' },
      ].map((player) => (
        <ListRow
          key={player.id}
          title={player.name}
          subtitle={player.games}
          selectable
          selected={selected.includes(player.id)}
          onSelect={() => toggle(player.id)}
        />
      ))}
    </List>
  )
}

export function SegmentedDemo() {
  const [value, setValue] = useState<'rounds' | 'total'>('rounds')
  return (
    <SegmentedControl
      ariaLabel="Mode de saisie"
      value={value}
      onChange={setValue}
      options={[
        { value: 'rounds', label: 'Par manche' },
        { value: 'total', label: 'Total final' },
      ]}
    />
  )
}

export function TabsDemo() {
  const [value, setValue] = useState<'skyjo' | 'tarot' | 'flip7'>('skyjo')
  const labels = { skyjo: 'Skyjo', tarot: 'Tarot', flip7: 'Flip 7' }
  return (
    <>
      <Tabs
        ariaLabel="Jeu"
        value={value}
        onChange={setValue}
        options={[
          { value: 'skyjo', label: 'Skyjo' },
          { value: 'tarot', label: 'Tarot' },
          { value: 'flip7', label: 'Flip 7' },
        ]}
      />
      <TabPanel ariaLabel={labels[value]}>
        <Text>Classement de {labels[value]}.</Text>
      </TabPanel>
    </>
  )
}

export function FormRowDemo() {
  const [value, setValue] = useState('')
  return (
    <FormRow>
      <TextInput
        ariaLabel="Nom du joueur"
        placeholder="Nom du joueur"
        value={value}
        onChange={setValue}
      />
      <Button icon="plus" onClick={noop}>
        Ajouter
      </Button>
    </FormRow>
  )
}

export function FilterDemo() {
  const [value, setValue] = useState('all')
  return (
    <FilterBar label="Jeu">
      <Select
        ariaLabel="Jeu"
        size="sm"
        value={value}
        onChange={setValue}
        options={[
          { value: 'all', label: 'Tous les jeux' },
          { value: 'skyjo', label: 'Skyjo' },
        ]}
      />
    </FilterBar>
  )
}

export function EditableCell() {
  const [value, setValue] = useState('7')
  return (
    <HistoryCell name="Bruno">
      <NumberField ariaLabel="Score de Bruno" value={value} onChange={setValue} />
    </HistoryCell>
  )
}

export function StandingsCardPair() {
  return (
    <>
      <StandingsCard rank={1} name="Alice" total={<Score size="lg">42</Score>} lead />
      <StandingsCard rank={2} name="Bruno" total={<Score size="lg">57</Score>} delta="+15" />
    </>
  )
}

export function StatusLineSet() {
  return (
    <>
      <StatusLine tone="success" details={['12 parties importées', '3 joueurs ajoutés']}>
        Import terminé
      </StatusLine>
      <StatusLine tone="warning">2 parties ignorées : déjà présentes</StatusLine>
      <StatusLine tone="danger">Fichier illisible</StatusLine>
      <StatusLine tone="info">Synchronisation avec Google Drive</StatusLine>
    </>
  )
}
