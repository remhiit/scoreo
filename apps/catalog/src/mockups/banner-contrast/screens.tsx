import { Banner, Stack, Text } from '@scoreboards/design-system'
import { BannerProposed } from './sketches/BannerProposed'

const noop = () => {}

const TITLE = 'Pour commencer'
const STEPS = [
  'Ajoutez des joueurs ci-dessus',
  'Créez un type de jeu (depuis le menu)',
  'Sélectionnez ≥2 joueurs et cliquez sur « Nouvelle partie »',
]
const RESUME = { icon: 'play' as const, label: 'Reprendre la partie en cours', onClick: noop }

/** Today: title and resume label in the accent, steps in the muted colour, title an `<h3>`. */
export function OnboardingToday() {
  return (
    <Stack gap={4}>
      <Text variant="heading">Joueurs</Text>
      <Banner title={TITLE} steps={STEPS} />
    </Stack>
  )
}

/** Proposed: every line in the body colour, the accent on the tint, border and step numbers. */
export function OnboardingProposed() {
  return (
    <Stack gap={4}>
      <Text variant="heading">Joueurs</Text>
      <BannerProposed title={TITLE} steps={STEPS} />
    </Stack>
  )
}

/** Today: the resume banner's label in the accent colour on the accent tint. */
export function ResumeToday() {
  return (
    <Stack gap={4}>
      <Banner action={RESUME} />
    </Stack>
  )
}

/** Proposed: the label in the body colour, the play icon kept in the accent. */
export function ResumeProposed() {
  return (
    <Stack gap={4}>
      <BannerProposed action={RESUME} />
    </Stack>
  )
}
