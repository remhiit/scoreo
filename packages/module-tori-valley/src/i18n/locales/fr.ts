import type { en } from './en'

export const fr: typeof en = {
  app: {
    title: 'Torī Valley',
    back: 'Retour',
    history: 'Historique',
    newMatch: 'Nouvelle partie',
    editMatch: 'Modifier la partie',
    matchSetup: 'Mise en place',
  },
  matchSetup: {
    heading: 'Cartes Objectif',
    intro: 'Une carte par paysage a été distribuée — indiquez laquelle.',
    variantAria: '{{landscape}} variante {{variant}}',
    toriiAlwaysInPlay: 'toujours en jeu',
    back: 'Retour',
    start: 'Commencer',
  },
  language: {
    label: 'Langue',
  },
  home: {
    playersHeading: 'Joueurs',
    newPlayerNameLabel: 'Nom du nouveau joueur',
    add: 'Ajouter',
    noPlayers: 'Aucun joueur pour le moment — ajoutez-en un ci-dessus.',
    deletePlayerAria: 'Supprimer {{name}}',
    viewHistory: "Voir l'historique",
    startMatch: 'Commencer la partie',
  },
  history: {
    noMatches: 'Aucune partie enregistrée pour le moment.',
    edit: 'Modifier',
    deleteMatchAria: 'Supprimer la partie',
    unknownPlayer: 'Joueur inconnu',
    vp: '{{value}} PV',
  },
  scoreDetail: {
    pinceauHolderLabel: 'Détenteur du Pinceau (+2 PV)',
    noneOption: '— Aucun —',
    playerTotal: '{{name}} — {{total}} PV',
    toriiHeading: 'Torī',
    toriiCountAria: 'Nombre de Torī {{color}} de {{name}}',
    objectifHeading: 'Cartes Objectif',
    objectifPointsAria: 'Points Objectif {{landscape}} de {{name}}',
    parcheminLabel: 'Parchemin',
    parcheminVp: '{{value}} PV',
    cancel: 'Annuler',
    save: 'Enregistrer la partie',
  },
  torii: {
    green: 'Vert',
    red: 'Rouge',
    blue: 'Bleu',
    yellow: 'Jaune',
    purple: 'Violet',
  },
  objectifCard: {
    bamboo: {
      A: { groups: 'Groupes de exactement 2 tuiles Bambou' },
      B: {
        groupsOf2: 'Groupes de 2 tuiles',
        groupsOf3: 'Groupes de 3 tuiles',
        groupsOf4: 'Groupes de 4 tuiles',
      },
      C: {
        onDiagonal: 'Tuiles sur une diagonale (cases ordinaires)',
        inCorner: 'Tuiles dans un coin',
        atCrossing: 'Une tuile occupe le croisement des diagonales',
      },
    },
    cherryBlossom: {
      A: { tiles: 'Tuiles Cerisier', fullColumns: 'Colonnes de 4 Cerisier' },
      B: { occupiedColumns: 'Colonnes contenant au moins 1 tuile' },
      C: { cherryTiles: 'Tuiles Cerisier', villageTiles: 'Tuiles Village' },
    },
    mountain: {
      A: { rowsWithExactlyOne: 'Lignes contenant exactement 1 Montagne' },
      B: { groups: 'Groupes de 2 tuiles Montagne ou plus' },
      C: { tiles: 'Tuiles Montagne', waterAdjacencies: 'Adjacences Montagne–Eau' },
    },
    village: {
      B: { largestGroupSize: 'Tuiles de votre plus grand groupe Village' },
      C: { distinctAdjacentTypes: 'Types voisins distincts, cumulés sur les Villages' },
    },
    water: {
      A: {
        largestGroupSize: 'Tuiles de votre plus grand groupe Eau',
        touchesTopAndBottom: 'Ce groupe touche les bords haut et bas',
      },
      B: { isolatedEdgeTiles: 'Tuiles Eau isolées touchant le bord du plateau' },
    },
    notComputable: {
      neighbours: 'Se calcule par rapport aux tableaux voisins — saisissez le total à la main.',
    },
    errors: {
      missing: 'Cette valeur est obligatoire',
      integer: 'Saisissez un nombre entier',
      range: 'Saisissez une valeur entre {{min}} et {{max}}',
    },
  },
  landscape: {
    bamboo: 'Bambou',
    cherryBlossom: 'Fleur de cerisier',
    mountain: 'Montagne',
    water: 'Eau',
    village: 'Village',
  },
  errors: {
    playerName: {
      blank: 'Le nom du joueur ne peut pas être vide',
      tooLong: 'Le nom du joueur doit contenir au plus {{max}} caractères',
    },
    match: {
      playerCount: 'Une partie nécessite entre {{min}} et {{max}} joueurs',
      duplicatePlayers: 'Identifiants de joueurs en double dans la partie',
      resultsCount: 'Il doit y avoir exactement un résultat par joueur',
      resultsCoverage: 'Les résultats doivent couvrir tous les joueurs de la partie',
    },
    notFound: {
      player: 'Joueur {{id}} introuvable',
      match: 'Partie {{id}} introuvable',
    },
  },
}
