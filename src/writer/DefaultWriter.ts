import { loadTemplate, writeOutput, type Writer } from './Writer.ts'
import { type Property, type Schema, type Model } from '../reader/Reader.ts'
import path from 'path'
import { type Plugin, type VerificationError } from '../plugin/Plugin.ts'
import Handlebars from 'handlebars'
import { applicationDiagram, moduleDiagram, schemaDiagramm } from './MermaidDiagramGenerator.ts'
import { getType, type PropertyType } from '../reader/helper/GetType.ts'

export function defaultWriter (
  outputFolder: string,
  plugins: Plugin[] = [],
  write: (output: string, relativeFilename: string) => Promise<void> = async (o, f) => { await writeOutput(o, f, outputFolder) },
  applicationTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/application.hbs'),
  moduleTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/module.hbs'),
  schemaTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/schema.hbs')
): Writer {
  return async function (model: Model): Promise<void> {
    Handlebars.registerHelper('mdMultiline', (input: string) => mdMultiline(input))
    Handlebars.registerHelper('mdRelativeLink', (fromId: string, toId: string) => mdRelativeLink(fromId, toId))
    Handlebars.registerHelper('mdGetType', (schema: Schema, property: Property) => mdGetType(schema, getType(model, schema, property)))
    Handlebars.registerHelper('mdGetProperty', (obj: any | undefined, property: string) => obj?.[property])
    Handlebars.registerHelper('mdJson', (input: unknown) => JSON.stringify(input))
    Handlebars.registerPartial('mdSubSchema', loadTemplate('src/writer/subSchema.hbs'))

    const verificationErrors = await validateAll(model, plugins)
    await generateOutput(outputFolder, model, plugins)

    for (const schema of model.schemas) {
      const errors = verificationErrors.filter(e => 'schema' in e && e.schema === schema)
      const context = {
        ...schema,
        definitions: Object.keys(schema.definitions).length === 0 ? undefined : schema.definitions,
        'x-links': [...schema['x-links'] ?? [], ...plugins.flatMap(p => p.getSchemaLinks(schema))],
        'x-todos': [...schema['x-todos'] ?? [], ...getErrorTodos(errors)],
        'x-tags': { $id: schema.$id, type: schema['x-schema-type'], ...schema['x-tags'] },
        classDiagram: schemaDiagramm(model, schema),
        errors
      }
      const output = schemaTemplate(context)
      await write(output, `${schema.$id}.md`)
    }

    for (const module of model.modules) {
      const errors = verificationErrors.filter(e => 'module' in e && e.module === module)
      const context = {
        ...module,
        'x-links': [...module['x-links'] ?? [], ...plugins.flatMap(p => p.getModuleLinks(module))],
        'x-todos': [...module['x-todos'] ?? [], ...getErrorTodos(errors)],
        'x-tags': { $id: module.$id, ...module['x-tags'] },
        errors,
        classDiagram: moduleDiagram(model, module),
        schemas: model.schemas.filter(s => s.$id.startsWith(module.$id))
      }
      const output = moduleTemplate(context)
      await write(output, path.join(module.$id, 'README.md'))
    }

    const application = model.application
    const errors = verificationErrors.filter(e => 'application' in e && e.application === application)
    const context = {
      ...application,
      'x-links': [...application['x-links'] ?? [], ...plugins.flatMap(p => p.getApplicationLinks(application))],
      'x-todos': [...application['x-todos'] ?? [], ...getErrorTodos(errors)],
      'x-tags': application['x-tags'] ?? undefined,
      errors,
      classDiagram: applicationDiagram(model),
      modules: model.modules
    }
    const output = applicationTemplate(context)
    await write(output, 'README.md')
  }
}

async function validateAll (model: Model, plugins: Plugin[]): Promise<VerificationError[]> {
  const errors = await Promise.all(plugins.map(async p => await p.validate(model)))
  return errors.flatMap(e => e)
}

async function generateOutput (outputFolder: string, model: Model, plugins: Plugin[]): Promise<void> {
  for (const plugin of plugins) {
    await plugin.generateOutput(outputFolder, model)
  }
}

function getErrorTodos (error: VerificationError[]): string[] {
  if (error.length === 0) return []
  return [`${error.length} validation errors`]
}

function mdMultiline (input: string): string {
  if (input === undefined) return ''
  return input.split('\n').map(l => l.trim()).join('<br>')
}

function mdRelativeLink (fromId: string, toId: string): string {
  return `./${path.relative(fromId, toId)}`
}

function mdGetType (schema: Schema, type: PropertyType): string {
  switch (type.type) {
    case 'array': return `[${mdGetType(schema, type.array)}]`
    case 'reference': return `[${type.name}](${mdRelativeLink(path.dirname(schema.$id), type.$id)}.md)`
    case 'self': return `[${type.name}](./)`
    case 'definition': return `[${type.name}](#${type.name})`
    case 'local':
      if (type.references) {
        return `References ${type.references.map(r => mdGetType(schema, r)).join(', ')}`
      } else {
        return type.name
      }
  }
}
