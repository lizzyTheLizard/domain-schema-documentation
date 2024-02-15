import { type Application, type Module, type Schema } from '../reader/IReader.ts'

export interface IVerifier {
  verify: () => Promise<void>
  getApplicationErrors: (application: Application) => VerificationError[]
  getModuleErrors: (module: Module) => VerificationError[]
  getSchemaErrors: (schema: Schema) => VerificationError[]
}

export interface VerificationError {
  text: string
  type: VerificationErrorType
  application: Application
  module?: Module
  schema?: Schema
}

export type VerificationErrorType = 'NOT_IN_DOMAIN_MODEL' | 'MISSING_IN_IMPLEMENTATION' | 'WRONG'
