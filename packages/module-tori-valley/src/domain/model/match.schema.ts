import { z } from 'zod'
import { defaultObjectifCardSelection, emptyObjectifPoints, OBJECTIF_VARIANTS } from './landscape'
import { emptyToriiCounts } from './torii'

export const ToriiCountsSchema = z.object({
  green: z.number().int().min(0).max(7).default(0),
  red: z.number().int().min(0).max(7).default(0),
  blue: z.number().int().min(0).max(7).default(0),
  yellow: z.number().int().min(0).max(7).default(0),
  purple: z.number().int().min(0).max(7).default(0),
})

export const ObjectifPointsSchema = z.object({
  bamboo: z.number().int().default(0),
  cherryBlossom: z.number().int().default(0),
  mountain: z.number().int().default(0),
  water: z.number().int().default(0),
  village: z.number().int().default(0),
})

export const ParcheminValueSchema = z
  .union([z.literal(0), z.literal(3), z.literal(4), z.literal(5)])
  .default(0)

export const PlayerResultSchema = z.object({
  playerId: z.string(),
  toriiCounts: ToriiCountsSchema.default(emptyToriiCounts),
  parcheminValue: ParcheminValueSchema,
  hasPinceau: z.boolean().default(false),
  objectifPoints: ObjectifPointsSchema.default(emptyObjectifPoints),
})

export const ObjectifVariantSchema = z.enum(OBJECTIF_VARIANTS).default('A')

export const ObjectifCardSelectionSchema = z.object({
  bamboo: ObjectifVariantSchema,
  cherryBlossom: ObjectifVariantSchema,
  mountain: ObjectifVariantSchema,
  water: ObjectifVariantSchema,
  village: ObjectifVariantSchema,
})

export const MatchSchema = z.object({
  id: z.string(),
  playedAt: z.number(),
  playerIds: z.array(z.string()).min(1),
  results: z.array(PlayerResultSchema).default([]),
  // Matches saved before card selection existed have no variants recorded;
  // they read back as all-A rather than failing to parse.
  objectifCards: ObjectifCardSelectionSchema.default(defaultObjectifCardSelection),
})
