import { type Application, type Input, type Module } from './input/Input.ts'
import { promises as fs } from 'fs'
import path from 'path'
import * as yaml from 'yaml'
import { InputValidator, type WithId } from './inputValidator/InputValidator.ts'
import { type Plugin } from '../plugin/Plugin.ts'
import { type Reader } from './Reader.ts'
import { inputNormalizer } from './inputNormalizer/InputNormalizer.ts'
import { type Schema, type SchemaCommon } from './input/Schema.ts'
import { type FormatName } from 'ajv-formats'
import { fullFormats } from 'ajv-formats/dist/formats'
import { type Format as avjFormat } from 'ajv'

export interface Format {
  name: string
  avjFormat: avjFormat
}

export const defaultFormats: Format[] = Object.keys(fullFormats).map(name => ({ name, avjFormat: fullFormats[name as FormatName] }))

export function defaultReader (
  inputFolder: string,
  plugins: Plugin[] = [],
  formats: Format[] = defaultFormats,
  inputValidator: InputValidator = new InputValidator({ ajvOptions: { allErrors: true }, noAdditionalPropertiesInExamples: true, formats }),
  readFile: (filePath: string) => Promise<unknown> = async (filePath) => await readYamlFile(filePath)
): Reader {
  return async function (): Promise<Input> {
    const result = await readFolderRecursive(inputFolder, inputFolder, inputValidator, 0, readFile)
    if (result.application === undefined) {
      throw new Error('No application file found')
    }
    inputValidator.finishValidation()
    const input: Input = { application: result.application, modules: result.modules, schemas: result.schemas }
    plugins.forEach(plugin => { plugin.validateInput(input) })
    return input
  }
}

interface Result { schemas: Schema[], modules: Module[], application?: Application }

async function readFolderRecursive (baseFolder: string, folder: string, inputValidator: InputValidator, depth: number, readFile: (filePath: string) => Promise<unknown>): Promise<Result> {
  const result: Result = { schemas: [], modules: [] }
  const files = await fs.readdir(folder)
  for (const file of files) {
    const filePath = path.join(folder, file)
    const lstat = await fs.lstat(filePath)
    if (lstat.isDirectory()) {
      const recResult = await readFolderRecursive(baseFolder, filePath, inputValidator, depth + 1, readFile)
      result.schemas.push(...recResult.schemas)
      result.modules.push(...recResult.modules)
    } else if (filePath.endsWith('index.yaml') && depth === 0) {
      const application = await readFile(filePath)
      inputValidator.validateApplicationFile(application)
      result.application = application as Application
    } else if (filePath.endsWith('index.yaml')) {
      const module = await readFile(filePath)
      const expectedId = '/' + path.dirname(path.relative(baseFolder, filePath))
      validateId(module, filePath, expectedId)
      inputValidator.validateModuleFile(module as WithId)
      result.modules.push(module as Module)
    } else if (filePath.endsWith('.yaml')) {
      const schema = await readFile(filePath)
      const expectedId = '/' + path.relative(baseFolder, filePath)
      validateId(schema, filePath, expectedId)
      inputValidator.validateSchemaFile(schema as WithId)
      const normalized = inputNormalizer(schema as SchemaCommon)
      result.schemas.push(normalized)
    } else {
      throw new Error(`Unexpected file ${filePath}. Not a valid input file`)
    }
  }
  return result
}

function validateId (obj: unknown, filePath: string, expectedId: string): void {
  if (obj === null || obj === undefined || (typeof obj !== 'object') || !('$id' in obj)) {
    throw new Error(`Invalid file ${filePath}: $id is missing`)
  }
  const id = obj.$id as string
  if (id !== expectedId) {
    throw new Error(`Invalid file ${filePath}: $id must be the same as the absolute file path '${expectedId}' but is '${id}'`)
  }
}

export async function readYamlFile (filePath: string): Promise<unknown> {
  const contend = await fs.readFile(filePath)
  return yaml.parse(contend.toString())
}
