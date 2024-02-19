import * as fs from 'fs'
import Handlebars from 'handlebars'
import { type Schema } from '../reader/Reader.ts'
import path from 'path'

export function loadTemplate (path: string): HandlebarsTemplateDelegate {
  const templateString = fs.readFileSync(path).toString()
  return Handlebars.compile(templateString)
}

export interface OutputOptions {
  fileEnding: string
  outputFolder: string
  subFolder?: string
}

export async function writeOutputForSchema (output: string, schema: Schema, options: OutputOptions): Promise<void> {
  const ending = path.extname(schema.$id)
  const dirname = path.dirname(schema.$id)
  const baseName = path.basename(schema.$id)
  const relativeFilename = options.subFolder !== undefined
    ? path.join(dirname, options.subFolder, baseName.replace(ending, options.fileEnding))
    : path.join(dirname, baseName.replace(ending, options.fileEnding))
  await writeOutput(output, relativeFilename, options.outputFolder)
}

export async function writeOutput (output: string, relativeFilename: string, outputFolder: string): Promise<void> {
  const outputFileName = path.join(outputFolder, relativeFilename)
  const outputDir = path.dirname(outputFileName)
  await fs.promises.mkdir(outputDir, { recursive: true })
  await fs.promises.writeFile(outputFileName, output, 'utf8')
}
