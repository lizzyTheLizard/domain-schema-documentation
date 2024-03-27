import { type Model, type Reader } from './Reader'
import { promises as fs } from 'fs'
import path from 'path'
import * as yaml from 'yaml'
import { InputNormalizer } from './InputNormalizer'

export type FileReader = (filePath: string) => Promise<unknown>

export interface DefaultReaderOptions {
  inputNormalizer: InputNormalizer
  fileReader?: FileReader
}

export function defaultReader (inputFolder: string, options?: DefaultReaderOptions): Reader {
  return async function (): Promise<Model> {
    const inputNormalizer = options?.inputNormalizer ?? new InputNormalizer()
    const fileReader = options?.fileReader ?? readYamlFile
    await readFolderRecursive(inputFolder, inputFolder, inputNormalizer, 0, fileReader)
    return inputNormalizer.toModel()
  }
}

async function readFolderRecursive (baseFolder: string, folder: string, inputNormalizer: InputNormalizer, depth: number, readFile: (filePath: string) => Promise<unknown>): Promise<void> {
  const files = await fs.readdir(folder)
  for (const file of files) {
    const filePath = path.join(folder, file)
    const lstat = await fs.lstat(filePath)
    if (lstat.isDirectory()) {
      await readFolderRecursive(baseFolder, filePath, inputNormalizer, depth + 1, readFile)
    } else if (filePath.endsWith('index.yaml') && depth === 0) {
      const application = await readFile(filePath)
      inputNormalizer.addApplication(application, filePath)
    } else if (filePath.endsWith('index.yaml')) {
      const module = await readFile(filePath)
      const expectedId = '/' + path.dirname(path.relative(baseFolder, filePath))
      inputNormalizer.addModule(module, filePath, expectedId)
    } else if (filePath.endsWith('.yaml')) {
      const schema = await readFile(filePath)
      const expectedId = '/' + path.relative(baseFolder, filePath)
      inputNormalizer.addSchema(schema, filePath, expectedId)
    } else {
      throw new Error(`Unexpected file ${filePath}. Not a valid input file`)
    }
  }
}

export async function readYamlFile (filePath: string): Promise<unknown> {
  const contend = await fs.readFile(filePath)
  return yaml.parse(contend.toString())
}
