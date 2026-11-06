import { render } from '@testing-library/react'
import * as DesignSystem from '@scoreboards/design-system'
import { describe, expect, it } from 'vitest'
import { MOCKUPS } from './shell/mockups'
import { STORIES } from './stories'
import { LAYERS } from './shell/types'

/**
 * Every component the design system exports: a capitalised function, or a
 * capitalised React object (`memo`, `forwardRef`) — both render as `<Name />`.
 */
const COMPONENTS = Object.entries(DesignSystem)
  .filter(
    ([name, value]) =>
      /^[A-Z]/.test(name) &&
      (typeof value === 'function' ||
        (typeof value === 'object' && value !== null && '$$typeof' in value)),
  )
  .map(([name]) => name)
  .sort()

const raw = (modules: Record<string, unknown>) => Object.entries(modules as Record<string, string>)

/**
 * Stories and mockup screens show the design system as the app uses it, so
 * they are held to the app's rule (eslint.config.js): no class, no inline
 * style, no icon import. Only the catalog's chrome (src/shell/) and a mockup's
 * sketches (src/mockups/<id>/sketches/) write classes.
 */
const COMPOSING_SOURCES = raw({
  ...import.meta.glob('./stories/**/*.tsx', { query: '?raw', import: 'default', eager: true }),
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
})
