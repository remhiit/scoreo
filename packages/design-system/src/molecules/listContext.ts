import { createContext, useContext } from 'react'

/** Set by `<List>` so its rows know they are list items. */
export const InListContext = createContext(false)

/**
 * Whether the calling row sits inside a `<List>`: only then does it expose the
 * `listitem` role, so a row rendered on its own never leaves an orphan item.
 */
export function useInList(): boolean {
  return useContext(InListContext)
}
