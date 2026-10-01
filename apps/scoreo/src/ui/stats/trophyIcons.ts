import type { IconName } from '@scoreboards/design-system'

/**
 * Trophy id -> design-system icon name. Lives in `ui/` on purpose: the domain
 * `Trophy` model and `application/` have no notion of icons.
 */
export const TROPHY_ICONS: Record<string, IconName> = {
  a1: 'flame',
  a2: 'trendingUp',
  a4: 'swords',
  b2: 'trophy',
  b3: 'target',
  c1: 'mountain',
  c3: 'crown',
  d1: 'star',
  e1: 'skull',
  f2: 'calendar',
  f3: 'medal',
}
