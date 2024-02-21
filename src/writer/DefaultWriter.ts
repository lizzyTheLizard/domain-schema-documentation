import { loadTemplate, writeOutput, type Writer } from './Writer.ts'
import { type Application, type Input, type Link, type Module, type Schema } from '../reader/Reader.ts'
import path from 'path'
import { type Plugin, type VerificationError } from '../plugin/Plugin.ts'

const applicationTemplate = loadTemplate('src/writer/application.hbs')
const moduleTemplate = loadTemplate('src/writer/module.hbs')
const schemaTemplate = loadTemplate('src/writer/schema.hbs')
const enumTemplate = loadTemplate('src/writer/enum.hbs')

type SchemaPlus = Schema & { links: Link[], errors: VerificationError[] }
type ModulePlus = Module & { errors: VerificationError[] }
type ApplicationPlus = Application & { errors: VerificationError[] }

export function defaultWriter (
  outputFolder: string,
  plugins: Plugin[] = [],
  writeApplication: (application: ApplicationPlus) => Promise<void> = async (app) => { await writeApplicationDocumentation(app, outputFolder) },
  writeModule: (module: ModulePlus) => Promise<void> = async (module) => { await writeModuleDocumentation(module, outputFolder) },
  writeSchema: (schema: SchemaPlus) => Promise<void> = async (schema) => { await writeSchemaDocumentation(schema, outputFolder) }
): Writer {
  return async function (input): Promise<void> {
    const verificationErrors = await validateAll(input, plugins)
    await generateOutput(outputFolder, input, plugins)

    for (const schema of input.schemas) {
      const links = plugins.flatMap(p => p.getSchemaLink(schema))
      const errors = verificationErrors.filter(e => 'schema' in e && e.schema === schema)
      await writeSchema({ ...schema, links, errors })
    }

    for (const module of input.modules) {
      const links = [...module.links ?? [], ...plugins.flatMap(p => p.getModuleLinks(module))]
      const errors = verificationErrors.filter(e => 'module' in e && e.module === module)
      await writeModule({ ...module, links, errors })
    }

    const links = [...input.application.links ?? [], ...plugins.flatMap(p => p.getApplicationLinks(input.application))]
    const errors = verificationErrors.filter(e => 'application' in e && e.application === input.application)
    await writeApplication({ ...input.application, links, errors })
  }
}

async function validateAll (input: Input, plugins: Plugin[]): Promise<VerificationError[]> {
  const errors = await Promise.all(plugins.map(async p => await p.validate(input)))
  return errors.flatMap(e => e)
}

async function generateOutput (outputFolder: string, input: Input, plugins: Plugin[]): Promise<void> {
  for (const plugin of plugins) {
    await plugin.generateOutput(outputFolder, input)
  }
}

async function writeApplicationDocumentation (application: Application, outputFolder: string): Promise<void> {
  // TODO: Implement template and test
  const output = applicationTemplate(application)
  await writeOutput(output, 'README.md', outputFolder)
}

async function writeModuleDocumentation (module: Module, outputFolder: string): Promise<void> {
  // TODO: Implement template and test
  const output = moduleTemplate(module)
  await writeOutput(output, path.join(module.$id, 'README.md'), outputFolder)
}

async function writeSchemaDocumentation (schema: SchemaPlus, outputFolder: string): Promise<void> {
  const ending = path.extname(schema.$id)
  const relativeFilename = schema.$id.replace(ending, '.md')
  if (schema.type !== 'object') {
    // TODO: Implement template and test
    const output = schemaTemplate(schema)
    await writeOutput(output, relativeFilename, outputFolder)
  } else {
    // TODO: Implement template and test
    const output = enumTemplate(schema)
    await writeOutput(output, relativeFilename, outputFolder)
  }
}
