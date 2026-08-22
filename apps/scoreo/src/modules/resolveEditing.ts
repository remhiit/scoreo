import type { ModuleMatchEdit } from '@scoreboards/module-api'
import type { Match } from '../domain/model/match'

/**
 * The payload a module gets back when a match is reopened — its own, and only
 * its own. A match scored by another module, or by Scoreo's own screen, carries
 * nothing this module could read, so it starts a fresh grid instead.
 */
export function resolveEditing(
  match: Match | undefined,
  moduleId: string,
): ModuleMatchEdit | undefined {
  const data = match?.moduleData
  if (!match || !data || data.moduleId !== moduleId) return undefined
  return { matchId: match.id, version: data.version, data: data.data }
}
