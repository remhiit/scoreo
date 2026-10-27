import { z } from 'zod'

export const PlayerScoreSchema = z.object({
  playerId: z.string(),
  score: z.number(),
})
