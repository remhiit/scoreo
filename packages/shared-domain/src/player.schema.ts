import { z } from 'zod'

/**
 * Parses a persisted player. `active` defaults to `true` so records written
 * before the flag existed still read back — changing that default, or the field
 * names, changes bytes already on users' devices.
 */
export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean().default(true),
})
