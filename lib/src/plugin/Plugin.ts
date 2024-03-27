import { type Model } from '../reader/Reader'
import { type VerificationError } from '../writer/Writer'

export interface Plugin {
  updateModel?: (model: Model) => Promise<Model>
  validate?: (model: Model) => Promise<VerificationError[]>
  generateOutput?: (model: Model) => Promise<void>
}
