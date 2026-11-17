import type { Mockup } from '../../shell/types'
import { OnboardingProposed, OnboardingToday, ResumeProposed, ResumeToday } from './screens'

const mockup: Mockup = {
  id: 'banner-contrast',
  title: 'Bannière d’accueil lisible',
  summary:
    'Aujourd’hui, le titre et le lien « Reprendre la partie » de la bannière sont écrits dans la couleur d’accent sur un fond teinté de cette même couleur (jusqu’à 2:1 en Latte selon l’accent), et les étapes en gris clair (4,2:1). Proposé : tout le texte en couleur de corps (5,3:1 au minimum, tous thèmes et accents confondus) ; numéros d’étape compris (en semi-gras) ; l’accent reste sur le fond, la bordure et l’icône. Le titre n’est plus un titre de section (`<p>` au lieu de `<h3>`), ce qui règle l’audit « heading-order ».',
  designSystemChanges: [
    'Banner : titre, étapes, numéros d’étape (semi-gras) et libellé d’action en --text-body ; icône d’action, décorative, gardée en --color-primary ; titre rendu en <p> semi-gras au lieu de <h3> ; API inchangée, children compris (esquisse : sketches/BannerProposed)',
  ],
  screens: [
    { name: 'Aujourd’hui — premier lancement', frame: 'phone', render: () => <OnboardingToday /> },
    { name: 'Proposé — premier lancement', frame: 'phone', render: () => <OnboardingProposed /> },
    { name: 'Aujourd’hui — reprendre une partie', frame: 'phone', render: () => <ResumeToday /> },
    { name: 'Proposé — reprendre une partie', frame: 'phone', render: () => <ResumeProposed /> },
  ],
}

export default mockup
