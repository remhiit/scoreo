export type DomainError =
  | { kind: 'Validation'; field: string; reason: string }
  | { kind: 'NotFound'; entity: string; id: string }

export function domainErrorMessage(error: DomainError): string {
  switch (error.kind) {
    case 'Validation':
      return `${error.field}: ${error.reason}`
    case 'NotFound':
      return `${error.entity} ${error.id} not found`
  }
}
