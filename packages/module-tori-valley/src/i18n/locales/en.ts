export const en = {
  app: {
    title: 'Torī Valley',
    back: 'Back',
    history: 'History',
    newMatch: 'New match',
    editMatch: 'Edit match',
    matchSetup: 'Match setup',
  },
  matchSetup: {
    heading: 'Objectif cards',
    intro: 'One card per landscape was dealt at setup — pick which variant.',
    variantAria: '{{landscape}} variant {{variant}}',
    toriiAlwaysInPlay: 'always in play',
    back: 'Back',
    start: 'Start match',
  },
  language: {
    label: 'Language',
  },
  home: {
    playersHeading: 'Players',
    newPlayerNameLabel: 'New player name',
    add: 'Add',
    noPlayers: 'No players yet — add some above.',
    deletePlayerAria: 'Delete {{name}}',
    viewHistory: 'View history',
    startMatch: 'Start match',
  },
  history: {
    noMatches: 'No matches recorded yet.',
    edit: 'Edit',
    deleteMatchAria: 'Delete match',
    unknownPlayer: 'Unknown player',
    vp: '{{value}} VP',
    exportForScoreo: 'Export for Scoreo',
    exportSkippedSolo_one: '1 solo match left out — Scoreo needs at least 2 players per match.',
    exportSkippedSolo_other:
      '{{count}} solo matches left out — Scoreo needs at least 2 players per match.',
    exportNothing:
      'Nothing to export — Scoreo needs at least 2 players per match, and every recorded match is solo.',
  },
  scoreDetail: {
    pinceauHolderLabel: 'Pinceau holder (+2 VP)',
    noneOption: '— None —',
    playerTotal: '{{name}} — {{total}} VP',
    toriiHeading: 'Torī',
    toriiCountAria: '{{name}} {{color}} Torī count',
    objectifHeading: 'Objectif cards',
    objectifPointsAria: '{{name}} {{landscape}} Objectif points',
    objectifVariant: '(card {{variant}})',
    objectifTotalLabel: 'Total',
    manualToggle: 'Enter the total by hand',
    manualToggleAria: 'Enter {{name}} {{landscape}} total by hand',
    vp: '{{value}} VP',
    parcheminLabel: 'Parchemin',
    parcheminVp: '{{value}} VP',
    cancel: 'Cancel',
    save: 'Save match',
  },
  torii: {
    green: 'Green',
    red: 'Red',
    blue: 'Blue',
    yellow: 'Yellow',
    purple: 'Purple',
  },
  objectifCard: {
    bamboo: {
      A: { groups: 'Groups of exactly 2 Bamboo tiles' },
      B: {
        groupsOf2: 'Groups of 2 tiles',
        groupsOf3: 'Groups of 3 tiles',
        groupsOf4: 'Groups of 4 tiles',
      },
      C: {
        onDiagonal: 'Tiles on a diagonal (plain squares)',
        inCorner: 'Tiles in a corner',
        atCrossing: 'A tile sits where the diagonals cross',
      },
    },
    cherryBlossom: {
      A: { tiles: 'Cherry Blossom tiles', fullColumns: 'Columns of 4 Cherry Blossom' },
      B: { occupiedColumns: 'Columns holding at least 1 tile' },
      C: { cherryTiles: 'Cherry Blossom tiles', villageTiles: 'Village tiles' },
    },
    mountain: {
      A: { rowsWithExactlyOne: 'Rows holding exactly 1 Mountain' },
      B: { groups: 'Groups of 2 or more Mountain tiles' },
      C: { tiles: 'Mountain tiles', waterAdjacencies: 'Mountain–Water adjacencies' },
    },
    village: {
      B: { largestGroupSize: 'Tiles in your largest Village group' },
      C: { distinctAdjacentTypes: 'Distinct neighbouring types, summed over Villages' },
    },
    water: {
      A: {
        largestGroupSize: 'Tiles in your largest Water group',
        touchesTopAndBottom: 'That group touches both the top and bottom edges',
      },
      B: { isolatedEdgeTiles: 'Isolated Water tiles touching the board edge' },
    },
    notComputable: {
      neighbours: "Scored against the neighbouring players' boards — enter the total by hand.",
    },
    errors: {
      missing: 'This value is required',
      integer: 'Enter a whole number',
      range: 'Enter a value between {{min}} and {{max}}',
    },
  },
  landscape: {
    bamboo: 'Bamboo',
    cherryBlossom: 'Cherry Blossom',
    mountain: 'Mountain',
    water: 'Water',
    village: 'Village',
  },
  errors: {
    playerName: {
      blank: 'Player name must not be blank',
      tooLong: 'Player name must be {{max}} characters or less',
    },
    match: {
      playerCount: 'A match needs between {{min}} and {{max}} players',
      duplicatePlayers: 'Duplicate player ids in match',
      resultsCount: 'There must be exactly one result per player',
      resultsCoverage: 'Results must cover every player in the match',
    },
    notFound: {
      player: 'Player {{id}} not found',
      match: 'Match {{id}} not found',
    },
  },
}
