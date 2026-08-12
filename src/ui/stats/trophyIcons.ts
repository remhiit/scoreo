import { Calendar, Crown, Flame, Mountain, Skull, Star, Swords, Target, TrendingUp, Trophy as TrophyIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Trophy id -> presentation icon. Lives in `ui/` on purpose: the domain
 * `Trophy` model and `application/` have no notion of icons.
 */
export const TROPHY_ICONS: Record<string, LucideIcon> = {
  a1: Flame,
  a2: TrendingUp,
  a4: Swords,
  b2: TrophyIcon,
  b3: Target,
  c1: Mountain,
  c3: Crown,
  d1: Star,
  e1: Skull,
  f2: Calendar,
}
