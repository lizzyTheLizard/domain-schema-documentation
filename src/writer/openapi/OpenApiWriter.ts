import { type Writer } from '../Writer.ts'
import { type Input, type Module } from '../../reader/Reader.ts'
import { loadTemplate, writeOutput } from '../WriterHelper.ts'
import path from 'path'

export function openApiWriter (outputFolder: string): Writer {
  const template = loadTemplate('src/writer/openapi/spec.hbs')

  return async function (input: Input): Promise<void> {
    await Promise.all([
      ...input.modules.map(async m => { await writeSpec(m) })
    ])
  }

  async function writeSpec (module: Module): Promise<void> {
    // TODO: Implement template and test
    const output = template(module)
    await writeOutput(output, path.join(module.$id, `${module.$id}.openapi.yaml`), outputFolder)
  }
}
