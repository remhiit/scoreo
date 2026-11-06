import { render } from '@testing-library/react'
import * as DesignSystem from '@scoreboards/design-system'
import { describe, expect, it } from 'vitest'
import { STORIES } from './stories'
import { LAYERS } from './shell/types'

/** Every component the design system exports: a function whose name is capitalised. */
const COMPONENTS = Object.entries(DesignSystem)
  .filter(([name, value]) => typeof value === 'function' && /^[A-Z]/.test(name))
  .map(([name]) => name)
  .sort()

/**
 * The stories show the design system as the app uses it, so they are held to
 * the app's rule (eslint.config.js): no class, no inline style, no icon import.
 * Only the catalog's chrome, src/shell/, styles itself.
 */
const STORY_SOURCES = import.meta.glob('./stories/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('catalog', () => {
  it.each(Object.entries(STORY_SOURCES))('%s composes the design system only', (_path, source) => {
    expect(source).not.toMatch(/\bclassName=/)
    expect(source).not.toMatch(/\bstyle=\{/)
    expect(source).not.toMatch(/from 'lucide-react'/)
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

  it.each(
    STORIES.flatMap((story) =>
      story.variants.map((variant) => [story.id, variant.name, variant] as const),
    ),
  )('renders %s — %s', (_id, _name, variant) => {
    const { container } = render(<>{variant.render()}</>)
    expect(container.firstChild).not.toBeNull()
  })
})
