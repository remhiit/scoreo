export type WinCondition = 'HIGHEST_SCORE' | 'LOWEST_SCORE' | 'MANUAL'

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

export type TieBreakRule = 'NONE' | 'MANUAL_SELECTION' | 'SECONDARY_SCORE'

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
