export class ValidationError extends Error {
  readonly kind = 'Validation' as const
  readonly field: string
  readonly reason: string
  /** Stable i18n key the UI layer can translate; falls back to `message` when absent. */
  readonly code?: string
  readonly params?: Record<string, string | number>

  constructor(
    field: string,
    reason: string,
    code?: string,
    params?: Record<string, string | number>,
  ) {
    super(`${field}: ${reason}`)
    this.name = 'ValidationError'
    this.field = field
    this.reason = reason
    this.code = code
    this.params = params
  }
}

export class NotFoundError extends Error {
  readonly kind = 'NotFound' as const
  readonly entity: string
  readonly id: string
  /** Stable i18n key the UI layer can translate; falls back to `message` when absent. */
  readonly code?: string

  constructor(entity: string, id: string, code?: string) {
    super(`${entity} ${id} not found`)
    this.name = 'NotFoundError'
    this.entity = entity
    this.id = id
    this.code = code
  }
}

export type DomainError = ValidationError | NotFoundError
