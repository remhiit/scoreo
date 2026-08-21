import { z } from 'zod'

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean().default(true),
})
