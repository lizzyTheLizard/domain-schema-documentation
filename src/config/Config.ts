import { type IReader } from '../reader/IReader'
import { type IWriter } from '../writer/IWriter'
import { type IVerifier } from '../verifier/IVerifier'

export interface Config {
  inputFolder: string
  outputFolder: string
  reader: IReader
  writer: IWriter[]
  verifier: IVerifier[]
}
