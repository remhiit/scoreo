import type { Story } from '../shell/types'
import { ATOM_STORIES } from './atoms'
import { MOLECULE_STORIES } from './molecules'
import { ORGANISM_STORIES } from './organisms'
import { TEMPLATE_STORIES } from './templates'
import { TOKEN_STORIES } from './tokens'

/** Every story, in atomic order. */
export const STORIES: Story[] = [
  ...TOKEN_STORIES,
  ...ATOM_STORIES,
  ...MOLECULE_STORIES,
  ...ORGANISM_STORIES,
  ...TEMPLATE_STORIES,
]
