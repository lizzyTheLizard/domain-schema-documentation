import { type InputNormalizer } from './InputNormalizer'

type FileReader = (filePath: string) => Promise<unknown>

/**
 * Options for the default reader
 */
export interface DefaultReaderOptions {
  /**
   * Object to normalize the input in certain ways. Takes inputs as defined in the JSON Schemas for the input and makes sure a model as defined is generated
   * @see Model
   * @see inputDefinition
   */
  inputNormalizer: InputNormalizer
  /**
   * The reader of a file, by default reads a yaml file but you could also e.g. read JSON or do some manipulations first
   */
  fileReader: FileReader
}
