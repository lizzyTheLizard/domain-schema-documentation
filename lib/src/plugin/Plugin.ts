import { type Model } from '../reader/Model'
import { type VerificationError } from '../writer/Writer'

// TODO: Document Plugin

export type Generator = (model: Model) => Promise<void>
export type Validator = (model: Model) => Promise<VerificationError[]>
export type Updator = (model: Model) => Promise<Model>

export interface Plugin {
  updateModel?: Updator
  validate?: Validator
  generateOutput?: Generator
}
