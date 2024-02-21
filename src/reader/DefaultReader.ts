import { type Application, Input, type Module, type Reader, type Schema } from './Reader.ts'
import { promises as fs } from 'fs'
import path from 'path'
import * as yaml from 'yaml'
import { InputValidator } from './inputValidator/InputValidator.ts'
import { type Plugin } from '../plugin/Plugin.ts'

export function defaultReader (
  inputFolder: string,
  plugins: Plugin[] = [],
  inputValidator: InputValidator = new InputValidator({}),
  readFile: (filePath: string) => Promise<unknown> = async (filePath) => await readYamlFile(filePath)
): Reader {
  return async function (): Promise<Input> {
    const result = await readFolderRecursive(inputFolder, inputFolder, inputValidator, 0, readFile)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const input = new Input(result.application!, result.modules, result.schemas)
    inputValidator.finishValidation()
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
      const application = await readFile(filePath) as Application
      inputValidator.validateApplicationFile(application)
      result.application = application
    } else if (filePath.endsWith('index.yaml')) {
      const module = await readFile(filePath) as Module
      const expectedId = '/' + path.dirname(path.relative(baseFolder, filePath))
      validateId(module.$id, filePath, expectedId)
      inputValidator.validateModuleFile(module)
      result.modules.push(module)
    } else if (filePath.endsWith('.yaml')) {
      const schema = await readFile(filePath) as Schema
      const expectedId = '/' + path.relative(baseFolder, filePath)
      validateId(schema.$id, filePath, expectedId)
      inputValidator.validateSchemaFile(schema)
      result.schemas.push(schema)
    } else {
      throw new Error(`Unexpected file ${filePath}. Not a valid input file`)
    }
  }
  return result
}

function validateId (id: string, filePath: string, expectedId: string): void {
  if (!id) {
    throw new Error(`Invalid file ${filePath}: $id is missing`)
  }
  if (id !== expectedId) {
    throw new Error(`Invalid file ${filePath}: $id must be the same as the absolute file path '${expectedId}' but is '${id}'`)
  }
}

export async function readYamlFile (filePath: string): Promise<unknown> {
  const contend = await fs.readFile(filePath)
  return yaml.parse(contend.toString())
}
