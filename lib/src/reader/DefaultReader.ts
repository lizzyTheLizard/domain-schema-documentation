import path from 'path'
import * as yaml from 'yaml'
import { promises as fs } from 'fs'
import { type Model, type Reader } from './Reader'
import { type FormatName, fullFormats } from 'ajv-formats/dist/formats'
import { InputNormalizer } from './InputNormalizer'
import { type InputValidatorOptions } from './InputValidator'
import { type SchemaNormalizerOptions } from '../schemaNormalizer/SchemaNormalizerOptions'

/**
 * Options for the default reader
 */
export interface DefaultReaderOptions extends InputValidatorOptions, SchemaNormalizerOptions {
  /**
   * The reader of a file, by default reads a yaml file but you could also e.g. read JSON or do some manipulations first
   */
  fileReader: FileReader
}

type FileReader = (filePath: string) => Promise<unknown>

/**
 * Create a default reader, reads the input folder as defined in the Readme and returns the model
 * @param inputFolder The folder to read from
 * @param optionsOrUndefined Additional options for the reader (optional). If not provided, the default options will be used.
 * @returns Returns the reader function
 */
export function defaultReader(inputFolder: string, optionsOrUndefined?: Partial<DefaultReaderOptions>): Reader {
  return async function (): Promise<Model> {
    const options = applyDefaults(optionsOrUndefined)
    const inputNormalizer = new InputNormalizer(options)
    await readFolderRecursive(inputFolder, inputFolder, 0, options, inputNormalizer)
    return inputNormalizer.toModel()
  }
}

function applyDefaults(options?: Partial<DefaultReaderOptions>): DefaultReaderOptions {
  const result = {
    fileReader: options?.fileReader ?? readYamlFile,
    ajvOptions: options?.ajvOptions ?? { allErrors: true },
    allowedFormats: options?.allowedFormats ?? defaultFormats,
    allowedKeywords: options?.allowedKeywords ?? [],
    discriminator: options?.discriminator ?? 'AJV',
    failOnNotSupportedProperties: true,
  }
  if (result.discriminator !== 'DENY') {
    result.allowedKeywords.push('discriminator')
  }
  result.ajvOptions.discriminator = result.discriminator === 'AJV'
  return result
}

async function readYamlFile(filePath: string): Promise<unknown> {
  const contend = await fs.readFile(filePath)
  return yaml.parse(contend.toString()) as unknown
}

async function readFolderRecursive(baseFolder: string, folder: string, depth: number, options: DefaultReaderOptions, inputNormalizer: InputNormalizer): Promise<void> {
  const files = await fs.readdir(folder)
  for (const file of files) {
    const filePath = path.join(folder, file)
    const lstat = await fs.lstat(filePath)
    if (lstat.isDirectory()) {
      await readFolderRecursive(baseFolder, filePath, depth + 1, options, inputNormalizer)
    } else if (isIndexFile(filePath) && depth === 0) {
      const application = await options.fileReader(filePath)
      inputNormalizer.addApplication(application, filePath)
    } else if (isIndexFile(filePath)) {
      const module = await options.fileReader(filePath)
      const expectedId = getExpectedId(baseFolder, path.dirname(filePath))
      inputNormalizer.addModule(module, filePath, expectedId)
    } else if (isYamlFile(filePath)) {
      const schema = await options.fileReader(filePath)
      const expectedId = getExpectedId(baseFolder, filePath)
      inputNormalizer.addSchema(schema, filePath, expectedId)
    } else {
      throw new Error(`Unexpected file ${filePath}. Not a valid input file`)
    }
  }
}

function getExpectedId(baseFolder: string, filePath: string): string {
  const relativeId = path.relative(baseFolder, filePath)
  // Normalize slashes
  return '/' + relativeId.replaceAll('\\', '/')
}

function isIndexFile(filePath: string): boolean {
  const filename = path.basename(filePath).toLowerCase()
  return filename === 'index.yaml' || filename === 'index.yml'
}

function isYamlFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.yaml' || ext === '.yml'
}

/**
 * The default list of formats to support. Basically all from avjFormats
 * @see {@link https://ajv.js.org/packages/ajv-formats.html}
 */
export const defaultFormats = Object.keys(fullFormats).map(name => ({ name, avjFormat: fullFormats[name as FormatName] }))
