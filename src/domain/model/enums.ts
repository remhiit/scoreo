import { z } from 'zod'

export const WinConditionSchema = z.enum(['HIGHEST_SCORE', 'LOWEST_SCORE', 'MANUAL'])
export type WinCondition = z.infer<typeof WinConditionSchema>

export function winConditionLabel(condition: WinCondition): string {
  switch (condition) {
    case 'HIGHEST_SCORE':
      return 'Highest score'
    case 'LOWEST_SCORE':
      return 'Lowest score'
    case 'MANUAL':
      return 'Manual'
  }
}

export const TieBreakRuleSchema = z.enum(['NONE', 'MANUAL_SELECTION', 'SECONDARY_SCORE'])
export type TieBreakRule = z.infer<typeof TieBreakRuleSchema>

export function tieBreakRuleLabel(rule: TieBreakRule): string {
  switch (rule) {
    case 'NONE':
      return 'No tie-break'
    case 'MANUAL_SELECTION':
      return 'Manual selection'
    case 'SECONDARY_SCORE':
      return 'Secondary score'
  }
}
