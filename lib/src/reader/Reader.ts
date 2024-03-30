import { type Model } from './Model'

/**
 * A reader is a function that reads a model from a source.
 */
export type Reader = () => Promise<Model>
