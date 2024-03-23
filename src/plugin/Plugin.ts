import { type Model } from '../reader/Reader.ts'
import { type VerificationError } from '../writer/Writer.ts'

export interface Plugin {
  updateModel?: (model: Model) => Promise<Model>
  validate?: (model: Model) => Promise<VerificationError[]>
  generateOutput?: (model: Model) => Promise<void>
}
