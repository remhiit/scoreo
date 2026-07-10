import { z } from 'zod'
import { TieBreakRuleSchema, WinConditionSchema } from './enums'

export const GameTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  winCondition: WinConditionSchema,
  tieBreakRule: TieBreakRuleSchema.default('NONE'),
  tieBreakCondition: WinConditionSchema.default('HIGHEST_SCORE'),
  tieBreakLabel: z.string().nullable().default(null),
  active: z.boolean().default(true),
})
