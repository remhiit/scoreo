import type { Mockup } from './types'

/**
 * Every mockup folder, found by convention: `src/mockups/<id>/index.tsx`
 * default-exports a `Mockup` whose `id` is the folder name.
 */
const MODULES = import.meta.glob<{ default: Mockup }>('../mockups/*/index.tsx', { eager: true })

export const MOCKUPS: Mockup[] = Object.entries(MODULES)
  .map(([path, module]) => ({ folder: path.split('/')[2], mockup: module.default }))
  .map(({ folder, mockup }) => {
    if (mockup.id !== folder) {
      throw new Error(`Mockup in src/mockups/${folder}/ declares id "${mockup.id}"`)
    }
    return mockup
  })
  .sort((a, b) => a.id.localeCompare(b.id))
