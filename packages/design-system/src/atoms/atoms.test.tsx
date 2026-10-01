import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Chip } from './Chip'
import { Icon } from './Icon'
import { Meter } from './Meter'
import { NumberInput } from './NumberInput'
import { Select } from './Select'
import { Swatch } from './Swatch'
import { Text } from './Text'
import { TextInput } from './TextInput'

describe('Button', () => {
  it('renders a label and fires onClick', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('names an icon-only button from its label', () => {
    render(<Button icon="edit" label="Rename" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Rename' })
    expect(button).toHaveClass('sc-btn--icon')
  })

  it('keeps an icon + label button unlabelled by aria so its text is the name', () => {
    render(
      <Button icon="plus" onClick={() => {}}>
        Add
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Add' })
    expect(button).not.toHaveClass('sc-btn--icon')
    expect(button).not.toHaveAttribute('aria-label')
  })

  it('does not fire when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('maps variant, size, shape and width to modifiers', () => {
    render(
      <Button variant="danger" size="lg" shape="pill" width="full" onClick={() => {}}>
        Delete
      </Button>,
    )
    expect(screen.getByRole('button')).toHaveClass(
      'sc-btn--danger',
      'sc-btn--lg',
      'sc-btn--pill',
      'sc-btn--full',
    )
  })
})

describe('Icon', () => {
  it('is decorative without a label', () => {
    const { container } = render(<Icon name="trophy" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is an image with a label', () => {
    render(<Icon name="trophy" label="Trophy" />)
    expect(screen.getByRole('img', { name: 'Trophy' })).toBeInTheDocument()
  })

  it('spins the loader and only the loader', () => {
    const { container, rerender } = render(<Icon name="loader" />)
    expect(container.querySelector('svg')).toHaveClass('sc-icon--spin')
    rerender(<Icon name="upload" />)
    expect(container.querySelector('svg')).not.toHaveClass('sc-icon--spin')
  })
})

describe('TextInput', () => {
  it('associates its label and reports changes', () => {
    const onChange = vi.fn()
    render(<TextInput label="Player name" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Léa' } })
    expect(onChange).toHaveBeenCalledWith('Léa')
  })

  it('submits on Enter', () => {
    const onEnter = vi.fn()
    render(<TextInput ariaLabel="Name" value="Léa" onChange={() => {}} onEnter={onEnter} />)
    fireEvent.keyUp(screen.getByRole('textbox', { name: 'Name' }), { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('shows the error under the field and marks it invalid', () => {
    render(
      <TextInput
        label="Name"
        value="Léa"
        onChange={() => {}}
        error="That name is already taken."
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('That name is already taken.')
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('NumberInput', () => {
  it('steps within bounds', () => {
    const onChange = vi.fn()
    render(<NumberInput ariaLabel="Score" value={0} min={0} max={3} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('clamps typed values and ignores unparseable ones', () => {
    const onChange = vi.fn()
    render(<NumberInput ariaLabel="Score" mode="plain" value={0} max={10} onChange={onChange} />)
    const input = screen.getByRole('spinbutton', { name: 'Score' })
    fireEvent.change(input, { target: { value: '42' } })
    expect(onChange).toHaveBeenLastCalledWith(10)
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('renders no stepper buttons in cell mode', () => {
    render(<NumberInput ariaLabel="Léa" mode="cell" value={4} onChange={() => {}} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('spinbutton')).toHaveClass('sc-input--cell')
  })
})

describe('Select', () => {
  it('lists a placeholder then the options, and reports the chosen value', () => {
    const onChange = vi.fn()
    render(
      <Select
        ariaLabel="Game"
        value=""
        placeholder="Choose…"
        options={[
          { value: 'a', label: 'Belote' },
          { value: 'b', label: 'Skyjo' },
        ]}
        onChange={onChange}
      />,
    )
    const select = screen.getByRole('combobox', { name: 'Game' })
    expect(select.querySelectorAll('option')).toHaveLength(3)
    fireEvent.change(select, { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Checkbox', () => {
  it('toggles from its label', () => {
    const onChange = vi.fn()
    render(
      <Checkbox checked={false} onChange={onChange}>
        Merge
      </Checkbox>,
    )
    fireEvent.click(screen.getByText('Merge'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Chip and Swatch', () => {
  it('expose their selected state', () => {
    render(
      <>
        <Chip selected onClick={() => {}}>
          Latte
        </Chip>
        <Swatch hue="blue" label="Blue" onClick={() => {}} />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Latte' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Meter', () => {
  it('clamps its value and reports it as a percentage', () => {
    render(<Meter value={1.4} label="Win rate" />)
    expect(screen.getByRole('meter', { name: 'Win rate' })).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('Badge and Text', () => {
  it('render their content with the tone modifier', () => {
    render(
      <>
        <Badge tone="accent" ariaLabel="ELO 1284">
          1284
        </Badge>
        <Text variant="error">Pick at least two players.</Text>
      </>,
    )
    expect(screen.getByLabelText('ELO 1284')).toHaveClass('sc-badge--accent')
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least two players.')
  })
})

describe('DateInput and NumberField', () => {
  it('reports the picked date', async () => {
    const { DateInput } = await import('./DateInput')
    const onChange = vi.fn()
    render(
      <DateInput
        label="Match date"
        layout="inline"
        value="2026-09-30"
        max="2026-09-30"
        onChange={onChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('Match date'), { target: { value: '2026-09-01' } })
    expect(onChange).toHaveBeenCalledWith('2026-09-01')
  })

  it('passes the raw text through, empty included', async () => {
    const { NumberField } = await import('./NumberField')
    const onChange = vi.fn()
    render(<NumberField ariaLabel="Léa" value="4" onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Léa' }), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('')
  })
})
