import {
  type Schema,
  type Application,
  type Link,
  type Module,
  type Model
} from '../reader/Reader.ts'

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
  updateModel?: (model: Model) => Promise<Model>
  validate?: (model: Model) => Promise<VerificationError[]>
  generateOutput?: (outputFolder: string, model: Model) => Promise<void>
  getApplicationLinks?: (application: Application) => Link[]
  getModuleLinks?: (module: Module) => Link[]
  getSchemaLinks?: (schema: Schema) => Link[]
}
