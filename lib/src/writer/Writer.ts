import { type Application, type Model, type Module, type Schema } from '../reader/Reader'

// TODO: Document

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

export type Writer = (model: Model, verificationErrors: VerificationError[]) => Promise<void>
