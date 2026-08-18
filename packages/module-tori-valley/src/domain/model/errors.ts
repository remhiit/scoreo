export class ValidationError extends Error {
  readonly kind = 'Validation' as const
  readonly field: string
  readonly reason: string

  constructor(field: string, reason: string) {
    super(`${field}: ${reason}`)
    this.name = 'ValidationError'
    this.field = field
    this.reason = reason
  }
}

export class NotFoundError extends Error {
  readonly kind = 'NotFound' as const
  readonly entity: string
  readonly id: string

  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`)
    this.name = 'NotFoundError'
    this.entity = entity
    this.id = id
  }
}

export type DomainError = ValidationError | NotFoundError
