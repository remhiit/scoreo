import { z } from 'zod'
import { PlayerScoreSchema } from './playerScore.schema'

/**
 * The module's own state, kept opaque on purpose: Scoreo stores `data` without
 * ever looking inside it, and only the module that wrote it can read it back.
 */
export const MatchModuleDataSchema = z.object({
  moduleId: z.string(),
  version: z.number().int(),
  data: z.unknown(),
})

export const MatchSchema = z.object({
  id: z.string(),
  date: z.number(),
  gameTypeId: z.string(),
  playerScores: z.array(PlayerScoreSchema),
  manualWinners: z.array(z.string()).default([]),
  secondaryPlayerScores: z.array(PlayerScoreSchema).default([]),
  rounds: z.array(z.array(PlayerScoreSchema)).default([]),
  // Matches Scoreo scored itself carry no module payload, and neither do those
  // saved before modules existed; both read back as `null`.
  moduleData: MatchModuleDataSchema.nullable().default(null),
})
