import { z } from 'zod'
import { ScoringModeSchema, TieBreakRuleSchema, WinConditionSchema } from './enums'

export const GameTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  winCondition: WinConditionSchema,
  // Game types saved before scoring modes existed read back as plain points.
  scoringMode: ScoringModeSchema.default('POINTS'),
  tieBreakRule: TieBreakRuleSchema.default('NONE'),
  tieBreakCondition: WinConditionSchema.default('HIGHEST_SCORE'),
  tieBreakLabel: z.string().nullable().default(null),
  active: z.boolean().default(true),
  // Game types saved before modules existed carry no moduleId; they read back
  // unbound rather than failing to parse.
  moduleId: z.string().nullable().default(null),
})
