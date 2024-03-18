import { type Model, type Reader } from './Reader.ts'
import { promises as fs } from 'fs'
import path from 'path'
import * as yaml from 'yaml'
import { type Plugin } from '../plugin/Plugin.ts'
import { InputNormalizer } from './InputNormalizer.ts'
import { type FormatName } from 'ajv-formats'
import { fullFormats } from 'ajv-formats/dist/formats'
import { type Format as avjFormat } from 'ajv'

export interface Format { name: string, avjFormat: avjFormat }
export const defaultFormats: Format[] = Object.keys(fullFormats).map(name => ({ name, avjFormat: fullFormats[name as FormatName] }))
export const defaultKeywords = ['discriminator']
export type InputNormalizerGenerator = () => InputNormalizer
export type FileReader = (filePath: string) => Promise<unknown>

export function defaultReader (
  inputFolder: string,
  plugins: Plugin[] = [],
  formats: Format[] = defaultFormats,
  allowedKeywords: string[] = defaultKeywords,
  inputNormalizerGenerator: InputNormalizerGenerator = () => new InputNormalizer({ ajvOptions: { allErrors: true }, noAdditionalPropertiesInExamples: true, formats, allowedKeywords }),
  readFile: FileReader = async (filePath) => await readYamlFile(filePath)
): Reader {
  return async function (): Promise<Model> {
    const inputNormalizer = inputNormalizerGenerator()
    await readFolderRecursive(inputFolder, inputFolder, inputNormalizer, 0, readFile)
    const model = inputNormalizer.toModel()
    plugins.forEach(plugin => { plugin.validateInput(model) })
    return model
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
