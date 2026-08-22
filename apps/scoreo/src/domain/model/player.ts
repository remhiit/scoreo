// `Player` is shared with every scoring module, so it lives in
// `@scoreboards/shared-domain`; this re-export keeps the app's domain layer
// speaking of `domain/model/player` like the rest of its models.
export type { Player } from '@scoreboards/shared-domain'
