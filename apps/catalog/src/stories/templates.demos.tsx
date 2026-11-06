// Small stateful demos the templates stories render. Kept apart from the stories
// so each file exports components only (fast refresh), or data only.
import { Score, StandingsCard, StandingsGrid } from '@scoreboards/design-system'

export function Standings() {
  return (
    <StandingsGrid ariaLabel="Classement">
      <StandingsCard rank={1} name="Alice" total={<Score size="lg">42</Score>} lead />
      <StandingsCard rank={2} name="Bruno" total={<Score size="lg">57</Score>} delta="+15" />
    </StandingsGrid>
  )
}
