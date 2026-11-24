import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import screenUsage from 'virtual:screen-usage'
import { MODULE_PIECES } from './pieces'
import { APP_SCREENS } from './screens'
import { DESIGN_SYSTEM_COMPONENTS } from './shell/designSystemComponents'
import { MOCKUPS } from './shell/mockups'
import { STORIES } from './stories'
import { LAYERS } from './shell/types'

const COMPONENTS = DESIGN_SYSTEM_COMPONENTS

/**
 * Every module's game pieces: what each module's `src/design/index.ts`
 * exports, `ModuleRoot` aside (the scope, not a piece). A glob, not a list: a
 * new module's pieces fall under the coverage guard from its first export.
 */
const MODULE_DESIGNS = Object.entries(
  import.meta.glob<Record<string, unknown>>('../../../packages/module-*/src/design/index.ts', {
    eager: true,
  }),
).map(([path, exports]) => ({
  module: /packages\/(module-[^/]+)\//.exec(path)![1],
  exports,
  pieces: Object.entries(exports)
    .filter(([name, value]) => /^[A-Z]/.test(name) && typeof value === 'function')
    .map(([name]) => name)
    .filter((name) => name !== 'ModuleRoot')
    .sort(),
}))

const raw = (modules: Record<string, unknown>) => Object.entries(modules as Record<string, string>)

/**
 * Stories, app screens and mockup screens show the design system as the app uses it, so
 * they are held to the app's rule (eslint.config.js): no class, no inline
 * style, no icon import. Only the catalog's chrome (src/shell/) and a mockup's
 * sketches (src/mockups/<id>/sketches/) write classes.
 */
const COMPOSING_SOURCES = raw({
  ...import.meta.glob('./stories/**/*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('./screens/**/*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('./pieces/**/*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob(['./mockups/**/*.tsx', '!./mockups/*/sketches/**'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
})
/** Sketches draft a design-system component: classes allowed, nothing else the app forbids. */
const SKETCH_SOURCES = raw(
  import.meta.glob('./mockups/*/sketches/**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)
/** A sketch's CSS reads the semantic tokens only, like the design system's own. */
const SKETCH_STYLES = raw(
  import.meta.glob('./mockups/*/sketches/**/*.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)

const CLASS_NAME = /\bclassName\s*=/
const INLINE_STYLE = /\bstyle\s*=\s*\{/
const LUCIDE = /from\s+['"]lucide-react['"]/

describe('catalog', () => {
  it.each(COMPOSING_SOURCES)('%s composes the design system only', (_path, source) => {
    expect(source).not.toMatch(CLASS_NAME)
    expect(source).not.toMatch(INLINE_STYLE)
    expect(source).not.toMatch(LUCIDE)
  })

  it.each(SKETCH_SOURCES)(
    'sketch %s writes no inline style and imports no icon',
    (_path, source) => {
      expect(source).not.toMatch(INLINE_STYLE)
      expect(source).not.toMatch(LUCIDE)
    },
  )

  it.each(SKETCH_STYLES)('sketch stylesheet %s reads semantic tokens only', (_path, source) => {
    expect(source).not.toMatch(/var\(--ctp-/)
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i)
  })

  it('shows every component the design system exports', () => {
    const covered = new Set(STORIES.flatMap((story) => story.covers))
    const missing = COMPONENTS.filter((name) => !covered.has(name))
    expect(missing, 'add a story under apps/catalog/src/stories/ for each').toEqual([])
  })

  it('covers only names the design system really exports', () => {
    const unknown = STORIES.flatMap((story) => story.covers).filter(
      (name) => !COMPONENTS.includes(name),
    )
    expect(unknown).toEqual([])
  })

  it('gives every story a unique id, a known layer and at least one variant', () => {
    const ids = STORIES.map((story) => story.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const story of STORIES) {
      expect(LAYERS.map((layer) => layer.id)).toContain(story.layer)
      expect(story.variants.length).toBeGreaterThan(0)
    }
  })

  it('gives every mockup at least one screen', () => {
    for (const mockup of MOCKUPS) expect(mockup.screens.length, mockup.id).toBeGreaterThan(0)
  })

  it.each(
    STORIES.flatMap((story) =>
      story.variants.map((variant) => [story.id, variant.name, variant] as const),
    ),
  )('renders %s — %s', (_id, _name, variant) => {
    const { container } = render(<>{variant.render()}</>)
    expect(container.firstChild).not.toBeNull()
  })

  it.each(
    MOCKUPS.flatMap((mockup) =>
      mockup.screens.map((screen) => [mockup.id, screen.name, screen] as const),
    ),
  )('renders mockup %s — %s', (_id, _name, screen) => {
    const { container } = render(<>{screen.render()}</>)
    expect(container.firstChild).not.toBeNull()
  })

  it('gives every app screen a unique type and at least one state', () => {
    const types = APP_SCREENS.map((screen) => screen.type)
    expect(new Set(types).size).toBe(types.length)
    for (const screen of APP_SCREENS) expect(screen.states.length, screen.type).toBeGreaterThan(0)
  })

  it.each(
    APP_SCREENS.flatMap((screen) =>
      screen.states.map((state) => [screen.type, state.name, state] as const),
    ),
  )('runs app screen %s — %s', async (_type, _name, state) => {
    const { container, findAllByRole } = render(<>{state.render()}</>)
    expect(container.firstChild).not.toBeNull()
    // A module's screen arrives lazily: wait for its first button, not the fallback.
    expect((await findAllByRole('button')).length).toBeGreaterThan(0)
  })

  it('shows every game piece a module exports from src/design/', () => {
    const missing = MODULE_DESIGNS.flatMap(({ module, pieces }) => {
      const entry = MODULE_PIECES.find((candidate) => candidate.id === module)
      const covered = new Set(entry?.pieces.flatMap((piece) => piece.covers) ?? [])
      return pieces.filter((name) => !covered.has(name)).map((name) => `${module}: ${name}`)
    })
    expect(missing, 'add a piece under apps/catalog/src/pieces/ for each').toEqual([])
  })

  it('covers only pieces a module really exports, under its own ModuleRoot', () => {
    for (const entry of MODULE_PIECES) {
      const design = MODULE_DESIGNS.find(({ module }) => module === entry.id)
      expect(design, entry.id).toBeDefined()
      expect(entry.Root, entry.id).toBe(design!.exports.ModuleRoot)
      const unknown = entry.pieces
        .flatMap((piece) => piece.covers)
        .filter((name) => !design!.pieces.includes(name))
      expect(unknown, entry.id).toEqual([])
    }
  })

  it('gives every piece a unique id, apart from the stories, and at least one variant', () => {
    const ids = [...STORIES, ...MODULE_PIECES.flatMap((entry) => entry.pieces)].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const piece of MODULE_PIECES.flatMap((entry) => entry.pieces))
      expect(piece.variants.length, piece.id).toBeGreaterThan(0)
  })

  it.each(
    MODULE_PIECES.flatMap((entry) =>
      entry.pieces.flatMap((piece) =>
        piece.variants.map(
          (variant) => [entry.id, piece.id, variant.name, entry, variant] as const,
        ),
      ),
    ),
  )('renders %s piece %s — %s under its ModuleRoot', (module, _id, _name, entry, variant) => {
    const { container } = render(<entry.Root>{variant.render()}</entry.Root>)
    const root = container.querySelector(`.${module}`)
    expect(root, `.${module}`).not.toBeNull()
    expect(root!.textContent).not.toBe('')
  })

  it('indexes the shell, every screen folder of the app and every module screen', () => {
    const ids = screenUsage.map((screen) => screen.id)
    expect(ids).toContain('shell')
    for (const id of [
      'home',
      'scoredetail',
      'history',
      'stats',
      'halloffame',
      'gametype',
      'import',
      'sync',
    ])
      expect(ids).toContain(id)
    for (const { module } of MODULE_DESIGNS) expect(ids).toContain(module)
    expect(screenUsage.find((screen) => screen.id === 'home')!.components).toContain('ActionBar')
  })
})
