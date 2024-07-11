import { type Model } from '../Reader'

/**
 * Normalizes the input. There are many ways how to write a JSON-Schema, but we do want to consistency to work with
 * So let's normalize the input so that it fits {@link Model}
 */
export interface InputNormalizer {
  /**
   * Adds an read application object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   */
  addApplication: (parsed: unknown, fileLocation: string) => void
  /**
   * Adds an read module object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   * @param expectedId An expected ID that should be in this object (e.g. from filename) or none, if no ID is expected
   */
  addModule: (parsed: unknown, fileLocation: string, expectedId?: string) => void
  /**
   * Adds an read schema object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   * @param expectedId The expected ID that should be in this object (e.g. from filename) or none, if no ID is expected
   */
  addSchema: (parsed: unknown, fileLocation: string, expectedId?: string) => void

  /**
   * Convert the read in object to a normalized model
   * @returns The normalized model
   */
  toModel: () => Model
}
