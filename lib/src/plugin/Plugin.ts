import { type Model } from '../reader/Reader'

/**
 * A plugins for domain model generation. A plugin gets the model before it is given to the writer.
 * It can then e.g.
 * - Generate additional output files
 * - Update the model with e.g. verifivation errors and links to generated files
 * or any other change on the model you can think of.
 */
export type Plugin = (model: Model) => Promise<void>
