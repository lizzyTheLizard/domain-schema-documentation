import { type Model } from '../reader/Model'
import { type VerificationError } from '../writer/Writer'

// TODO: Document Plugin
export interface Plugin {
  updateModel?: (model: Model) => Promise<Model>
  validate?: (model: Model) => Promise<VerificationError[]>
  generateOutput?: (model: Model) => Promise<void>
}
