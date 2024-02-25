import { type Application, type Input, type Link, type Module } from '../reader/input/Input.ts'
import { type Schema } from '../reader/input/Schema.ts'

export type VerificationError = ApplicationVerificationError | ModuleVerificationError | SchemaVerificationError

export interface ApplicationVerificationError {
  text: string
  type: VerificationErrorType
  application: Application
}

export interface ModuleVerificationError {
  text: string
  type: VerificationErrorType
  module: Module
}

export interface SchemaVerificationError {
  text: string
  type: VerificationErrorType
  schema: Schema
}

export type VerificationErrorType = 'NOT_IN_DOMAIN_MODEL' | 'MISSING_IN_IMPLEMENTATION' | 'WRONG'

export interface Plugin {
  validateInput: (input: Input) => void
  validate: (input: Input) => Promise<VerificationError[]>
  generateOutput: (outputFolder: string, input: Input) => Promise<void>
  getApplicationLinks: (application: Application) => Link[]
  getModuleLinks: (module: Module) => Link[]
  getSchemaLinks: (schema: Schema) => Link[]
}
