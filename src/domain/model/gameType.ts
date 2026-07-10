import type { TieBreakRule, WinCondition } from './enums'

export interface GameType {
  id: string
  name: string
  winCondition: WinCondition
  tieBreakRule: TieBreakRule
  tieBreakCondition: WinCondition
  tieBreakLabel: string | null
  active: boolean
}
