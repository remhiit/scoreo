import type { Mockup } from '../../shell/types'
import { DetailProposed, DetailToday, EditToday, ListProposed, ListToday } from './screens'

const mockup: Mockup = {
  id: 'module-game-rules',
  title: 'Règles d’un jeu à module en lecture seule',
  summary:
    'Aujourd’hui, un jeu joué avec un compteur de points dédié (Skyjo, Flip 7, Torī Valley, 1000 Sabords) se modifie comme un jeu ordinaire : on peut passer Skyjo en « score le plus haut » et fausser tout son historique. Proposé : plus d’action « Modifier » pour ces jeux, un détail en lecture seule qui montre la plage de joueurs et dit que les règles viennent du compteur.',
  designSystemChanges: [],
  screens: [
    { name: 'Aujourd’hui — liste des jeux', frame: 'phone', render: () => <ListToday /> },
    { name: 'Proposé — liste des jeux', frame: 'phone', render: () => <ListProposed /> },
    { name: 'Aujourd’hui — détail de Skyjo', frame: 'phone', render: () => <DetailToday /> },
    {
      name: 'Aujourd’hui — modifier Skyjo (règles faussées)',
      frame: 'phone',
      render: () => <EditToday />,
    },
    { name: 'Proposé — détail de Skyjo', frame: 'phone', render: () => <DetailProposed /> },
  ],
}

export default mockup
