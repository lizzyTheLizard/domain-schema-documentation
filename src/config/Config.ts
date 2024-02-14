import { type IReader } from '../reader/IReader'

export interface Config {
  inputFolder: string
  outputFolder: string
  reader: IReader
  writer: IWriter[]
  verifier: IVerifier[]
}
