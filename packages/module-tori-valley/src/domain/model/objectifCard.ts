import { ValidationError } from './errors'
import type { LandscapeType, ObjectifVariant } from './landscape'

/**
 * Scoring rules for the physical Objectif cards, transcribed in
 * doc/functional/features/objectif-cards.md.
 *
 * Rather than modelling the player's board tile by tile, each card asks for the
 * handful of counts a player can read straight off their own board — "how many
 * groups of two Bamboo tiles?" — and turns them into points. Two cards can't
 * work that way at all: Village A and Eau C compare against the *neighbouring*
 * players' boards, which needs a seating order the app doesn't model, so they
 * are declared here but left to manual entry.
 */

/** A count the player reads off their board. `max` is a sanity bound, not a game rule. */
export interface ObjectifInputField {
  key: string
  /** i18n key for the field's label, under the `objectifCard.` namespace. */
  labelKey: string
  min: number
  max: number
  /** `flag` renders as a yes/no; stored as 0 or 1 so inputs stay one flat numeric shape. */
  kind: 'count' | 'flag'
}

export type ObjectifCardInputs = Record<string, number>

/** What the player entered for each landscape's card, keyed by field. */
export type ObjectifInputsByLandscape = Record<LandscapeType, ObjectifCardInputs>

export function emptyObjectifInputs(): ObjectifInputsByLandscape {
  return { bamboo: {}, cherryBlossom: {}, mountain: {}, water: {}, village: {} }
}

/** Landscapes whose total was typed by hand rather than computed. */
export type ObjectifManualFlags = Record<LandscapeType, boolean>

export function emptyObjectifManual(): ObjectifManualFlags {
  return { bamboo: false, cherryBlossom: false, mountain: false, water: false, village: false }
}

export interface ObjectifCardDefinition {
  landscape: LandscapeType
  variant: ObjectifVariant
  computable: boolean
  /** Why this card can't be computed; set only when `computable` is false. */
  notComputableReasonKey?: string
  fields: ObjectifInputField[]
  score: (inputs: ObjectifCardInputs) => number
}

/** A board is 4 rows tall and 5 columns wide, which bounds every count below. */
const MAX_TILES = 20

/** Field declaration before it knows which card it belongs to. */
type FieldSpec = Omit<ObjectifInputField, 'labelKey'>

function count(key: string, max: number): FieldSpec {
  return { key, min: 0, max, kind: 'count' }
}

function flag(key: string): FieldSpec {
  return { key, min: 0, max: 1, kind: 'flag' }
}

/** Bambou A's printed table, indexed by number of qualifying groups. */
const BAMBOO_A_TABLE = [0, 4, 9, 15, 22, 30]

function card(
  landscape: LandscapeType,
  variant: ObjectifVariant,
  fields: FieldSpec[],
  score: (i: ObjectifCardInputs) => number,
): ObjectifCardDefinition {
  return {
    landscape,
    variant,
    computable: true,
    // Label keys are per-card: the same field key means different things on
    // different cards (Bambou A's `groups` is groups of exactly 2 tiles,
    // Montagne B's is groups of 2 or more).
    fields: fields.map((f) => ({
      ...f,
      labelKey: `objectifCard.${landscape}.${variant}.${f.key}`,
    })),
    score,
  }
}

function neighbourDependent(
  landscape: LandscapeType,
  variant: ObjectifVariant,
): ObjectifCardDefinition {
  return {
    landscape,
    variant,
    computable: false,
    notComputableReasonKey: 'objectifCard.notComputable.neighbours',
    fields: [],
    score: () => {
      throw new ValidationError(
        `${landscape}-${variant}`,
        'This card is scored against the neighbouring players boards and must be entered manually',
        'objectifCard.notComputable.neighbours',
      )
    },
  }
}

const CARDS: ObjectifCardDefinition[] = [
  // — Bambou —
  card(
    'bamboo',
    'A',
    [count('groups', BAMBOO_A_TABLE.length - 1)],
    (i) => BAMBOO_A_TABLE[i.groups],
  ),
  card(
    'bamboo',
    'B',
    [count('groupsOf2', MAX_TILES / 2), count('groupsOf3', 6), count('groupsOf4', 5)],
    (i) => 4 * i.groupsOf2 + 10 * i.groupsOf3 + 16 * i.groupsOf4,
  ),
  card(
    'bamboo',
    'C',
    [count('onDiagonal', MAX_TILES), count('inCorner', 4), flag('atCrossing')],
    (i) => 3 * i.onDiagonal + 4 * i.inCorner + 6 * i.atCrossing,
  ),

  // — Cerisier —
  card(
    'cherryBlossom',
    'A',
    [count('tiles', MAX_TILES), count('fullColumns', 5)],
    (i) => 2 * i.tiles + 6 * i.fullColumns,
  ),
  card('cherryBlossom', 'B', [count('occupiedColumns', 5)], (i) => 3 * i.occupiedColumns),
  card(
    'cherryBlossom',
    'C',
    [count('cherryTiles', MAX_TILES), count('villageTiles', MAX_TILES)],
    (i) => i.cherryTiles * i.villageTiles,
  ),

  // — Montagne —
  card('mountain', 'A', [count('rowsWithExactlyOne', 4)], (i) => 3 * i.rowsWithExactlyOne),
  card('mountain', 'B', [count('groups', MAX_TILES / 2)], (i) => 6 * i.groups),
  card(
    'mountain',
    'C',
    [count('tiles', MAX_TILES), count('waterAdjacencies', MAX_TILES * 4)],
    (i) => i.tiles + i.waterAdjacencies,
  ),

  // — Village —
  neighbourDependent('village', 'A'),
  card('village', 'B', [count('largestGroupSize', MAX_TILES)], (i) => 4 * i.largestGroupSize),
  card(
    'village',
    'C',
    [count('distinctAdjacentTypes', MAX_TILES * 4)],
    (i) => 2 * i.distinctAdjacentTypes,
  ),

  // — Eau —
  card(
    'water',
    'A',
    [count('largestGroupSize', MAX_TILES), flag('touchesTopAndBottom')],
    (i) => 3 * i.largestGroupSize + i.touchesTopAndBottom * i.largestGroupSize,
  ),
  card('water', 'B', [count('isolatedEdgeTiles', MAX_TILES)], (i) => 4 * i.isolatedEdgeTiles),
  neighbourDependent('water', 'C'),
]

export function objectifCard(
  landscape: LandscapeType,
  variant: ObjectifVariant,
): ObjectifCardDefinition {
  const found = CARDS.find((c) => c.landscape === landscape && c.variant === variant)
  if (!found) throw new ValidationError('card', `No Objectif card for ${landscape} ${variant}`)
  return found
}

function validate(field: ObjectifInputField, inputs: ObjectifCardInputs): void {
  const value = inputs[field.key]
  if (value === undefined) {
    throw new ValidationError(field.key, 'Missing input', 'objectifCard.errors.missing')
  }
  if (!Number.isInteger(value)) {
    throw new ValidationError(
      field.key,
      'Input must be a whole number',
      'objectifCard.errors.integer',
    )
  }
  if (value < field.min || value > field.max) {
    throw new ValidationError(
      field.key,
      `Input must be between ${field.min} and ${field.max}`,
      'objectifCard.errors.range',
      { min: field.min, max: field.max },
    )
  }
}

/**
 * Points for one landscape, from the counts the player entered.
 * Throws `ValidationError` on a missing/out-of-range input, or when the card
 * isn't computable, rather than returning a plausible-looking wrong number.
 */
export function scoreObjectifCard(
  landscape: LandscapeType,
  variant: ObjectifVariant,
  inputs: ObjectifCardInputs,
): number {
  const definition = objectifCard(landscape, variant)
  // An unticked flag means "no", not "not answered yet" — only counts are
  // genuinely required, so a card whose optional flag is absent still scores.
  const effective: ObjectifCardInputs = { ...inputs }
  for (const field of definition.fields) {
    if (field.kind === 'flag' && effective[field.key] === undefined) effective[field.key] = 0
  }
  for (const field of definition.fields) validate(field, effective)
  return definition.score(effective)
}
