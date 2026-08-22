/**
 * A person who plays matches. Shared by the host app and by every scoring
 * module: a module reads the host's players rather than keeping its own roster.
 */
export interface Player {
  id: string
  name: string
  active: boolean
}
