import { z } from 'zod'

export const WinConditionSchema = z.enum(['HIGHEST_SCORE', 'LOWEST_SCORE', 'MANUAL'])

export const TieBreakRuleSchema = z.enum(['NONE', 'MANUAL_SELECTION', 'SECONDARY_SCORE'])

export const GameTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  winCondition: WinConditionSchema,
  tieBreakRule: TieBreakRuleSchema.default('NONE'),
  tieBreakCondition: WinConditionSchema.default('HIGHEST_SCORE'),
  tieBreakLabel: z.string().nullable().default(null),
  active: z.boolean().default(true),
})
