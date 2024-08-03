export interface SchemaNormalizerError {
  path: string[]
  value?: unknown
  type: SchemaNormalizerErrorType
  message?: string
}

export type SchemaNormalizerErrorType = 'MISSING_REQUIRED_PROPERTY' | 'NOT_SUPPORTED_VALUE' | 'NOT_SUPPORTED_PROPERTY'
