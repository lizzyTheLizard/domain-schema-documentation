import { type Model } from './Model'
import { promises as fs } from 'fs'
import path from 'path'
import { type Reader } from './Reader'
import { type DefaultReaderOptions } from './DefaultReaderOptions'
import { InputNormalizer } from './InputNormalizer'
import * as yaml from 'yaml'

/**
 * Create a default reader, reads the input folder as defined in the Readme and returns the model
 * @param {string} inputFolder The folder to read from
 * @param {DefaultReaderOptions} optionsOrUndefined Additional options for the reader (optional)
 * @see DefaultReaderOptions
 * @returns {() => Promise<Model>} Returns the reader function
 */
export function defaultReader (inputFolder: string, optionsOrUndefined?: Partial<DefaultReaderOptions>): Reader {
  return async function (): Promise<Model> {
    const options = applyDefaults(optionsOrUndefined)
    await readFolderRecursive(inputFolder, inputFolder, 0, options)
    return options.inputNormalizer.toModel()
  }
}

function applyDefaults (options?: Partial<DefaultReaderOptions>): DefaultReaderOptions {
  return {
    inputNormalizer: options?.inputNormalizer ?? new InputNormalizer(),
    fileReader: options?.fileReader ?? readYamlFile
  }
}

async function readYamlFile (filePath: string): Promise<unknown> {
  const contend = await fs.readFile(filePath)
  return yaml.parse(contend.toString())
}

async function readFolderRecursive (baseFolder: string, folder: string, depth: number, options: DefaultReaderOptions): Promise<void> {
  const files = await fs.readdir(folder)
  for (const file of files) {
    const filePath = path.join(folder, file)
    const lstat = await fs.lstat(filePath)
    if (lstat.isDirectory()) {
      await readFolderRecursive(baseFolder, filePath, depth + 1, options)
    } else if (filePath.endsWith('index.yaml') && depth === 0) {
      const application = await options.fileReader(filePath)
      options.inputNormalizer.addApplication(application, filePath)
    } else if (filePath.endsWith('index.yaml')) {
      const module = await options.fileReader(filePath)
      const expectedId = '/' + path.dirname(path.relative(baseFolder, filePath))
      options.inputNormalizer.addModule(module, filePath, expectedId)
    } else if (filePath.endsWith('.yaml')) {
      const schema = await options.fileReader(filePath)
      const expectedId = '/' + path.relative(baseFolder, filePath)
      options.inputNormalizer.addSchema(schema, filePath, expectedId)
    } else {
      throw new Error(`Unexpected file ${filePath}. Not a valid input file`)
    }
  }
}
