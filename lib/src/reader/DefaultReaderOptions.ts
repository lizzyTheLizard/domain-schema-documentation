import { type InputNormalizer } from './InputNormalizer'
import { type FileReader } from './DefaultReader'

// TODO Document Reader, DefaultReader and Options
export interface DefaultReaderOptions {
  inputNormalizer: InputNormalizer
  fileReader?: FileReader
}
