import { type Writer } from '../Writer.ts'
import { type Application, type Input, type Module, type Schema } from '../../reader/Reader.ts'
import { loadTemplate, type OutputOptions, writeOutput, writeOutputForSchema } from '../WriterHelper.ts'
import path from 'path'

export function markdownDocumentationWriter (outputFolder: string): Writer {
  const outputOptions: OutputOptions = { fileEnding: '.md', outputFolder }
  const applicationTemplate = loadTemplate('src/writer/markdown/application.hbs')
  const moduleTemplate = loadTemplate('src/writer/markdown/module.hbs')
  const schemaTemplate = loadTemplate('src/writer/markdown/schema.hbs')
  const enumTemplate = loadTemplate('src/writer/markdown/enum.hbs')

  async function writeApplicationDocumentation (application: Application): Promise<void> {
    // TODO: Implement template and test
    const output = applicationTemplate(application)
    await writeOutput(output, 'README.md', outputFolder)
  }

  async function writeModuleDocumentation (module: Module): Promise<void> {
    // TODO: Implement template and test
    const output = moduleTemplate(module)
    await writeOutput(output, path.join(module.$id, 'README.md'), outputFolder)
  }

  async function writeSchemaDocumentation (schema: Schema): Promise<void> {
    if (schema.type !== 'object') {
      // TODO: Implement template and test
      const output = schemaTemplate(schema)
      await writeOutputForSchema(output, schema, outputOptions)
    } else {
      // TODO: Implement template and test
      const output = enumTemplate(schema)
      await writeOutputForSchema(output, schema, outputOptions)
    }
  }

  return async function (input: Input): Promise<void> {
    await Promise.all([
      writeApplicationDocumentation(input.application),
      ...input.modules.map(async m => { await writeModuleDocumentation(m) }),
      ...input.schemas.map(async s => { await writeSchemaDocumentation(s) })
    ])
  }
}
