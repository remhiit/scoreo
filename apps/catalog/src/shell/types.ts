import type { ComponentType, ReactNode } from 'react'

/** The atomic layers, in the order the design system builds them. */
export const LAYERS = [
  { id: 'tokens', number: '00', title: 'Tokens' },
  { id: 'atoms', number: '01', title: 'Atomes' },
  { id: 'molecules', number: '02', title: 'Molécules' },
  { id: 'organisms', number: '03', title: 'Organismes' },
  { id: 'templates', number: '04', title: 'Templates' },
] as const

export type LayerId = (typeof LAYERS)[number]['id']

/**
 * How a variant is framed:
 * - `inline`: laid on the page, for most atoms and molecules;
 * - `phone`: a 390 × 640 screen, which also contains anything `position: fixed`
 *   (action bar, dialog, sheet, side menu) — the frame is their viewport.
 */
export type Frame = 'inline' | 'phone'

export interface Variant {
  name: string
  frame?: Frame
  render: () => ReactNode
}

/**
 * One entry of the catalog. `covers` names the design-system exports it shows:
 * `catalog.test.tsx` fails when an export is covered by no story, so a new
 * component cannot land without its specimen.
 */
export interface Story {
  id: string
  title: string
  layer: LayerId
  covers: string[]
  /** When to use it, in one or two sentences — the usage rule, not the API. */
  usage: string
  variants: Variant[]
}

/**
 * A mockup: the screens of a feature not coded yet, composed from the real
 * components with example data, reviewed before any code is written
 * (doc/technical/design-workflow.md). One folder per feature under
 * `src/mockups/<id>/`, whose `index.tsx` default-exports this.
 */
export interface Mockup {
  /** The folder name, kebab-case. */
  id: string
  title: string
  /** The GitHub issue the mockup is for, when it exists. */
  issue?: number
  /** What changes for the player, in one or two sentences. */
  summary: string
  /**
   * The design-system changes the feature needs: a component or prop to add,
   * each drafted under `sketches/` when it is new. Empty when the feature only
   * composes what exists.
   */
  designSystemChanges: string[]
  screens: Variant[]
}

/**
 * One screen of Scoreo as it ships: the real screen, run with example data
 * (`src/screens/`), in each state worth keeping a trace of. Unlike a mockup it
 * is never removed: it is the record of what the app looks like today.
 */
export interface AppScreen {
  /** The `Screen['type']` of the app's router: one entry per screen. */
  type: string
  title: string
  /** What the player does there, in one or two sentences. */
  summary: string
  states: Variant[]
}

/**
 * A game piece: a component a module keeps in its own `src/design/` because
 * the design system has none for it (a dice counter, a round grid). Shown like
 * a story, under its module's root.
 */
export type Piece = Omit<Story, 'layer'>

/**
 * The game pieces of one module (`src/pieces/`). `catalog.test.tsx` fails when
 * a piece its `src/design/index.ts` exports is covered by no entry.
 */
export interface PieceModule {
  /** The package folder (`module-skyjo`), also the class its `ModuleRoot` scopes the pieces' CSS with. */
  id: string
  /** The game, as a player names it. */
  title: string
  /** The module's `ModuleRoot`: every variant renders inside it, so its scoped CSS applies. */
  Root: ComponentType<{ children: ReactNode }>
  pieces: Piece[]
}
