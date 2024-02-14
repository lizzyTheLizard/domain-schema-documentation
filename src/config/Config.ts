import { type IReader } from '../reader/IReader'
import { type IWriter } from '../writer/IWriter'
import { type IVerifier } from '../verifier/IVerifier'
import {Options} from "ajv";

export interface Config {
  inputFolder: string
  outputFolder: string
  ajvOps?: Options
  reader: IReader
  writer: IWriter[]
  verifier: IVerifier[]
}
