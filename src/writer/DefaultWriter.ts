import { loadTemplate, writeOutput, type Writer } from './Writer.ts'
import { type Input } from '../reader/input/Input.ts'
import path from 'path'
import { type Plugin, type VerificationError } from '../plugin/Plugin.ts'
import Handlebars from 'handlebars'
import { getIdWithoutEnding, getName } from '../reader/input/InputHelper.ts'
import { type EnumDefinition, type Property, type Schema } from '../reader/input/Schema.ts'

// TODO: Test this

export function defaultWriter (
  outputFolder: string,
  plugins: Plugin[] = [],
  write: (output: string, relativeFilename: string) => Promise<void> = async (o, f) => { await writeOutput(o, f, outputFolder) },
  applicationTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/application.hbs'),
  moduleTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/module.hbs'),
  schemaTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/schema.hbs')
): Writer {
  Handlebars.registerHelper('mdRemovePrefixAndFileEnding', (toId: string, fromId: string) => mdRemovePrefixAndFileEnding(toId, fromId))
  Handlebars.registerHelper('mdMultiline', (input: string) => mdMultiline(input))
  Handlebars.registerHelper('mdGetType', (schema: Schema, property: Property) => mdGetType(schema, property))
  Handlebars.registerHelper('mdGetEnumDocu', (property: EnumDefinition, key: string) => mdGetEnumDocu(property, key))
  Handlebars.registerHelper('mdJson', (input: unknown) => JSON.stringify(input))
  Handlebars.registerPartial('mdSubSchema', loadTemplate('src/writer/subSchema.hbs'))

  return async function (input: Input): Promise<void> {
    const verificationErrors = await validateAll(input, plugins)
    await generateOutput(outputFolder, input, plugins)

    for (const schema of input.schemas) {
      const errors = verificationErrors.filter(e => 'schema' in e && e.schema === schema)
      const context = {
        ...schema,
        'x-links': [...schema['x-links'] ?? [], ...plugins.flatMap(p => p.getSchemaLinks(schema))],
        'x-todos': [...schema['x-todos'] ?? [], ...getErrorTodos(errors)],
        'x-tags': { $id: schema.$id, type: schema['x-schema-type'], ...schema['x-tags'] },
        errors,
        subSchemas: schema.definitions ?? {}
      }
      const output = schemaTemplate(context)
      await write(output, `${getIdWithoutEnding(schema.$id)}.md`)
    }

    for (const module of input.modules) {
      const errors = verificationErrors.filter(e => 'module' in e && e.module === module)
      const context = {
        ...module,
        'x-links': [...module['x-links'] ?? [], ...plugins.flatMap(p => p.getModuleLinks(module))],
        'x-todos': [...module['x-todos'] ?? [], ...getErrorTodos(errors)],
        'x-tags': { $id: module.$id, ...module['x-tags'] },
        errors,
        schemas: input.schemas.filter(s => s.$id.startsWith(module.$id))
      }
      const output = moduleTemplate(context)
      await write(output, path.join(module.$id, 'README.md'))
    }

    const application = input.application
    const errors = verificationErrors.filter(e => 'application' in e && e.application === application)
    const context = {
      ...application,
      'x-links': [...application['x-links'] ?? [], ...plugins.flatMap(p => p.getApplicationLinks(application))],
      'x-todos': [...application['x-todos'] ?? [], ...getErrorTodos(errors)],
      'x-tags': { ...application['x-tags'] },
      errors,
      modules: input.modules
    }
    const output = applicationTemplate(context)
    await write(output, 'README.md')
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

function getErrorTodos (error: VerificationError[]): string[] {
  if (error.length === 0) return []
  return [`${error.length} validation errors`]
}

function mdRemovePrefixAndFileEnding (text: string, prefix: string): string {
  text = text.replace(path.extname(text), '')
  if (text.startsWith(prefix)) return text.substring(prefix.length)
  return text
}

function mdMultiline (input: string): string {
  if (input === undefined) return ''
  return input.split('\n').map(l => l.trim()).join('<br>')
}

function mdGetEnumDocu (property: EnumDefinition, key: string): string {
  return property['x-enum-description']?.[key] ?? ''
}

function mdGetType (schema: Schema, property: Property): string {
  if (property === undefined) return 'UNDEFINED'
  if ('const' in property) return JSON.stringify(property.const)
  if (property.type === 'array') return `[${mdGetType(schema, property.items ?? { type: 'object' })}]`
  if (property.type === 'null') return 'Null'
  if ('enum' in property) return (property.enum as string[]).map(e => `"${e}"`).join(' | ')
  if ('format' in property) return property.format ?? 'MISSING FORMAT'
  if ('$ref' in property) return mdGetReferenceType(schema, property.$ref ?? 'MISSING REFERENCE')
  if ('x-references' in property) return `Reference to ${mdGetReferenceType(schema, property['x-references'] ?? '')}`
  return property.type
}

function mdGetReferenceType (schema: Schema, reference: string | string[]): string {
  if (Array.isArray(reference)) {
    const references = reference.map(r => mdGetReferenceType(schema, r))
    if (references.length === 1) return references[0]
    return references.slice(0, -1).join(', ') + ' or ' + references.pop()
  }
  if (!reference.startsWith('#')) {
    const name = getName(reference)
    const link = `${getIdWithoutEnding(reference)}.md`
    return `[${name}](${link})`
  }
  if (reference === '#') {
    const name = getName(schema)
    const link = `./${getName(schema)}.md`
    return `[${name}](${link})`
  }
  if (reference.startsWith('#/definitions/')) {
    const name = getName(reference)
    const link = `#${name}`
    return `[${name}](${link})`
  }
  console.error(`Invalid reference '${reference}' in ${schema.$id}, cannot determine type`)
  return 'Invalid reference'
}
