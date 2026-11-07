import { z } from 'zod'

export const MatchDraftSchema = z.object({
  gameTypeId: z.string(),
  playerIds: z.array(z.string()),
  rounds: z.array(z.record(z.string(), z.string())),
  updatedAt: z.number().default(() => Date.now()),
  moduleState: z.object({ moduleId: z.string(), state: z.unknown() }).nullable().default(null),
})
