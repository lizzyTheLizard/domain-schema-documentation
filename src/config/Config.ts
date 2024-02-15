import { type IReader } from '../reader/IReader.ts'
import { type IWriter } from '../writer/IWriter.ts'
import { type IVerifier } from '../verifier/IVerifier.ts'
import { type Options } from 'ajv'

export interface Config {
  noAdditionalPropertiesByDefault: boolean
  inputFolder: string
  outputFolder: string
  ajvOps?: Options
  reader: IReader
  writer: IWriter[]
  verifier: IVerifier[]
}
