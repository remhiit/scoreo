import type { ReactNode } from 'react'

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
 *   (header, action bar, dialog, sheet, side menu) — the frame is their viewport.
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
