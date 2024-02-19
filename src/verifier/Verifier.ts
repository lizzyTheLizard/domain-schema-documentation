import { type Application, type Input, type Module, type Schema } from '../reader/Reader.ts'

export type Verifier = (input: Input) => Promise<VerificationError[]>

export interface VerificationError {
  text: string
  type: VerificationErrorType
  application: Application
  module?: Module
  schema?: Schema
}

export type VerificationErrorType = 'NOT_IN_DOMAIN_MODEL' | 'MISSING_IN_IMPLEMENTATION' | 'WRONG'
