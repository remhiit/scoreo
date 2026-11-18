import type { Screen } from './screen'

/** Where the current screen comes from and how to change it, whatever keeps it. */
export interface Router {
  current: Screen
  navigate: (screen: Screen) => void
}
