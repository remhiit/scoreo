import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BindModuleUseCase } from '../../application/bindModuleUseCase'
import type { GameType } from '../../domain/model/gameType'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { MODULE_MANIFESTS } from '../../modules/registry'
import {
  GameSelectModalContainer,
  type GameSelectModalContainerProps,
  type GameSelectModalHandle,
} from './GameSelectModalContainer'

function gameType(overrides: Partial<GameType> & Pick<GameType, 'id' | 'name'>): GameType {
  return {
    winCondition: 'HIGHEST_SCORE',
    scoringMode: 'POINTS' as const,
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    minPlayers: null,
    maxPlayers: null,
    active: true,
    ...overrides,
  }
}

function renderModal(
  repo: InMemoryGameTypeRepository,
  selectedPlayerIds: string[] = ['p1', 'p2'],
  overrides: Partial<GameSelectModalContainerProps> = {},
) {
  const props: GameSelectModalContainerProps = {
    getGameTypes: (includeInactive) => repo.getAll(includeInactive),
    onAddGameType: vi.fn(),
    onStartGame: vi.fn(),
    onStartModule: vi.fn(),
    onStartModuleInScoreo: vi.fn(),
    selectedPlayerIds,
    ...overrides,
  }
  const ref = createRef<GameSelectModalHandle>()
  render(<GameSelectModalContainer ref={ref} {...props} />)
  act(() => ref.current?.open())
  const dialog = screen.getByRole('dialog')
  const options = () =>
    within(within(dialog).getByRole('combobox'))
      .getAllByRole('option')
      .filter((o) => (o as HTMLOptionElement).value !== '')
      .map((o) => o.textContent)
  const select = (label: string) => {
    const option = within(within(dialog).getByRole('combobox')).getByRole('option', {
      name: label,
    }) as HTMLOptionElement
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: option.value } })
  }
  return { props, dialog, options, select }
}

const moduleLabels = MODULE_MANIFESTS.map((m) => m.gameNames[0])
const sortedModuleLabels = [...moduleLabels].sort((a, b) => a.localeCompare(b))

describe('GameSelectModalContainer', () => {
  it('lists every registered module as a game on a blank profile, without creating any game type', () => {
    const repo = new InMemoryGameTypeRepository()
    const { options, dialog } = renderModal(repo)

    expect(options()).toEqual(sortedModuleLabels)
    expect(repo.getAll(true)).toEqual([])
    expect(within(dialog).queryByText('Available modules')).not.toBeInTheDocument()
  })

  it('places the unbound modules after the existing games, sorted by label', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt1', name: 'Zebra' }))
    repo.save(gameType({ id: 'gt2', name: 'Chess' }))
    const { options } = renderModal(repo)

    expect(options()).toEqual(['Zebra', 'Chess', ...sortedModuleLabels])
  })

  it('shows an active bound module only once, through its game type', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt1', name: 'My Skyjo', moduleId: 'skyjo' }))
    const { options } = renderModal(repo)

    expect(options()).toEqual([
      'My Skyjo',
      ...sortedModuleLabels.filter((label) => label !== 'Skyjo'),
    ])
  })

  it('never offers a module whose game type is archived', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt1', name: 'Skyjo', moduleId: 'skyjo', active: false }))
    const { options } = renderModal(repo)

    expect(options()).not.toContain('Skyjo')
  })

  it('does not offer a module when an unbound game already carries one of its names', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt1', name: '  skyJO ' }))
    const { options } = renderModal(repo)

    expect(options().filter((label) => label?.trim().toLowerCase() === 'skyjo')).toHaveLength(1)
  })

  it('offers the module on an unbound game carrying its name, and hands its module id over', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt1', name: ' skyJO ' }))
    const { dialog, select, props } = renderModal(repo)

    select('skyJO')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Play on the module' }))

    expect(props.onStartModule).toHaveBeenCalledWith('skyjo', ['p1', 'p2'])
    expect(props.onStartGame).not.toHaveBeenCalled()
  })

  it('does not offer a module already bound elsewhere on an unbound game carrying its name', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt1', name: 'Skyjo' }))
    repo.save(gameType({ id: 'gt2', name: 'Old Skyjo', moduleId: 'skyjo', active: false }))
    const { dialog, select } = renderModal(repo)

    select('Skyjo')

    expect(
      within(dialog).queryByRole('button', { name: 'Play on the module' }),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Start match' })).toBeEnabled()
  })

  it('does not offer the module on an unbound homonym the binding would not pick', () => {
    // BindModuleUseCase rule 2 stamps the first name match of getAll(true),
    // archived included: here the older archived "Skyjo", not the selected one.
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt-old', name: 'Skyjo', active: false }))
    repo.save(gameType({ id: 'gt-new', name: 'skyjo' }))
    const { dialog, select } = renderModal(repo)

    select('skyjo')

    expect(
      within(dialog).queryByRole('button', { name: 'Play on the module' }),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Start match' })).toBeEnabled()
  })

  it('keeps the module reachable through its own entry when the binding would pick an archived homonym', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt-old', name: 'Skyjo', active: false }))
    repo.save(gameType({ id: 'gt-new', name: 'skyjo' }))
    const bound: GameType[] = []
    const { dialog, options, select } = renderModal(repo, ['p1', 'p2'], {
      onStartModule: (moduleId) => {
        const manifest = MODULE_MANIFESTS.find((m) => m.moduleId === moduleId)
        if (manifest) bound.push(new BindModuleUseCase(repo).invoke(manifest))
      },
    })

    expect(options()).toEqual(['skyjo', ...sortedModuleLabels])

    select('Skyjo')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Play on the module' }))

    expect(bound.map((gt) => gt.id)).toEqual(['gt-old'])
    expect(repo.findById('gt-old')).toMatchObject({ moduleId: 'skyjo', active: true })
  })

  it('offers the module on the unbound homonym the binding picks, and binds that very game', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt-new', name: 'skyjo' }))
    repo.save(gameType({ id: 'gt-old', name: 'Skyjo', active: false }))
    const bound: GameType[] = []
    const { dialog, select } = renderModal(repo, ['p1', 'p2'], {
      onStartModule: (moduleId) => {
        const manifest = MODULE_MANIFESTS.find((m) => m.moduleId === moduleId)
        if (manifest) bound.push(new BindModuleUseCase(repo).invoke(manifest))
      },
    })

    select('skyjo')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Play on the module' }))

    expect(bound.map((gt) => gt.id)).toEqual(['gt-new'])
    expect(repo.findById('gt-old')).toMatchObject({ moduleId: null, active: false })
  })

  it('offers both ways in for an unbound module entry', () => {
    const repo = new InMemoryGameTypeRepository()
    const { dialog, select } = renderModal(repo)

    select('Skyjo')

    expect(within(dialog).getByRole('button', { name: 'Play in Scoreo' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Play on the module' })).toBeEnabled()
  })

  it('"Play on the module" on an unbound entry hands its module id over', () => {
    const repo = new InMemoryGameTypeRepository()
    const { dialog, select, props } = renderModal(repo)

    select('Skyjo')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Play on the module' }))

    expect(props.onStartModule).toHaveBeenCalledWith('skyjo', ['p1', 'p2'])
    expect(props.onStartGame).not.toHaveBeenCalled()
  })

  it('"Play in Scoreo" on an unbound entry asks to bind the module and open the generic screen', () => {
    const repo = new InMemoryGameTypeRepository()
    const { dialog, select, props } = renderModal(repo)

    select('Skyjo')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Play in Scoreo' }))

    expect(props.onStartModuleInScoreo).toHaveBeenCalledWith('skyjo', ['p1', 'p2'])
    expect(props.onStartGame).not.toHaveBeenCalled()
    expect(repo.getAll(true)).toEqual([])
  })

  it('"Play in Scoreo" on a bound game starts it like any other game', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'gt1', name: 'Skyjo', moduleId: 'skyjo' }))
    const { dialog, select, props } = renderModal(repo)

    select('Skyjo')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Play in Scoreo' }))

    expect(props.onStartGame).toHaveBeenCalledWith('gt1', ['p1', 'p2'])
    expect(props.onStartModuleInScoreo).not.toHaveBeenCalled()
  })

  it.each([
    ['an unbound entry', false],
    ['a bound game', true],
  ])(
    'keeps %s listed out of the module player range, with only the module button disabled',
    (_, bound) => {
      const repo = new InMemoryGameTypeRepository()
      if (bound) {
        repo.save(gameType({ id: 'gt1', name: 'La Vallée des Torī', moduleId: 'tori-valley' }))
      }
      const { dialog, select, options } = renderModal(repo, ['p1', 'p2', 'p3', 'p4', 'p5'])

      expect(options()).toContain('La Vallée des Torī')
      select('La Vallée des Torī')

      expect(within(dialog).getByRole('button', { name: 'Play on the module' })).toBeDisabled()
      expect(within(dialog).getByRole('button', { name: 'Play in Scoreo' })).toBeEnabled()
      expect(within(dialog).getByText('2–4 players')).toBeInTheDocument()
    },
  )

  it('does not show the player range while the player count fits the module', () => {
    const repo = new InMemoryGameTypeRepository()
    const { dialog, select } = renderModal(repo)

    select('La Vallée des Torī')

    expect(within(dialog).queryByText('2–4 players')).not.toBeInTheDocument()
  })

  describe('player range of an ordinary game', () => {
    const START = { name: 'Start match' }

    it('blocks the launch and shows the range when the players are outside it', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'gt1', name: 'Chess', minPlayers: 2, maxPlayers: 4 }))
      const { dialog, select } = renderModal(repo, ['p1', 'p2', 'p3', 'p4', 'p5'])

      select('Chess')

      expect(within(dialog).getByRole('button', START)).toBeDisabled()
      expect(within(dialog).getByText('2–4 players')).toBeInTheDocument()
    })

    it('allows the launch when the players fit, bounds included', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'gt1', name: 'Chess', minPlayers: 2, maxPlayers: 2 }))
      const { dialog, select } = renderModal(repo, ['p1', 'p2'])

      select('Chess')

      expect(within(dialog).getByRole('button', START)).toBeEnabled()
      expect(within(dialog).queryByText('2–2 players')).not.toBeInTheDocument()
    })

    it('only checks the bound that is set', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'gt1', name: 'Chess', minPlayers: 3 }))
      repo.save(gameType({ id: 'gt2', name: 'Go', maxPlayers: 2 }))
      const { dialog, select } = renderModal(repo, ['p1', 'p2'])

      select('Chess')
      expect(within(dialog).getByRole('button', START)).toBeDisabled()
      expect(within(dialog).getByText('At least 3 players')).toBeInTheDocument()

      select('Go')
      expect(within(dialog).getByRole('button', START)).toBeEnabled()
    })

    it('does not block a game without range', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'gt1', name: 'Chess' }))
      const { dialog, select } = renderModal(repo, [])

      select('Chess')

      expect(within(dialog).getByRole('button', START)).toBeEnabled()
    })

    it('checks a game bound to a module against its manifest, not its own range', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(
        gameType({
          id: 'gt1',
          name: 'My Tori',
          moduleId: 'tori-valley',
          minPlayers: 6,
          maxPlayers: 6,
        }),
      )
      const { dialog, select } = renderModal(repo, ['p1', 'p2'])

      select('My Tori')

      expect(within(dialog).getByRole('button', { name: 'Play in Scoreo' })).toBeEnabled()
      expect(within(dialog).getByRole('button', { name: 'Play on the module' })).toBeEnabled()
    })
  })
})
