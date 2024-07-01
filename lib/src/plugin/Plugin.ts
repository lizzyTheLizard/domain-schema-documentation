import { type Model } from '../reader/Reader'
import { type VerificationError } from '../writer/Writer'

/**
 * A plugins for domain model generation. A plugin can update the model, validate  implmenentations and generate output.
 */
export interface Plugin {
  /**
   * Update the model. This can be used to add links to the model or to add additional information.
   */
  updateModel?: Updator
  /**
   * Validate an existing implementation.
   * It returns a list of errors that are found in the implementation. Those errors will be added to the documentation
   */
  validate?: Validator
  /**
   * Generate output. This can be used to generate code or documentation from the model.
   */
  generateOutput?: Generator
}

export type Generator = (model: Model) => Promise<void>
export type Validator = (model: Model) => Promise<VerificationError[]>
export type Updator = (model: Model) => Promise<Model>
