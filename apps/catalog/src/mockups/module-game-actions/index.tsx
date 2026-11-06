import type { Mockup } from '../../shell/types'
import { FinishedProposed, FinishedToday, PlayingProposed, PlayingToday } from './screens'

const mockup: Mockup = {
  id: 'module-game-actions',
  title: 'Actions de partie des modules',
  summary:
    'Flip 7, Skyjo et 1000 Sabords redessinent chacun à la main « Annuler la dernière manche », « Abandonner » et « Enregistrer la partie », avec des emojis en guise d’icônes. Proposé : un seul composant partagé, les icônes du jeu fermé, et l’enregistrement dans la barre du bas comme sur les écrans de Scoreo.',
  designSystemChanges: [
    'Nouvel organisme ModuleGameActions (esquisse dans sketches/), phases « en cours » et « terminée »',
    'Icônes undo, save et flag ajoutées à icons.ts (back et check servent de remplaçants sur cette maquette)',
  ],
  screens: [
    { name: 'Aujourd’hui — partie en cours (Skyjo)', render: () => <PlayingToday /> },
    { name: 'Proposé — partie en cours', render: () => <PlayingProposed /> },
    { name: 'Aujourd’hui — fin de partie (Flip 7)', render: () => <FinishedToday /> },
    { name: 'Proposé — fin de partie', render: () => <FinishedProposed /> },
  ],
}

export default mockup
