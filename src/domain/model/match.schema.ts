import { z } from 'zod'
import { PlayerScoreSchema } from './playerScore.schema'

export const MatchSchema = z.object({
  id: z.string(),
  date: z.number(),
  gameTypeId: z.string(),
  playerScores: z.array(PlayerScoreSchema),
  manualWinners: z.array(z.string()).default([]),
  secondaryPlayerScores: z.array(PlayerScoreSchema).default([]),
})
