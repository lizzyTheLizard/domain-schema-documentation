import { type Writer, applyWriterOptionsDefaults, type WriterBaseOptions } from '../Writer'
import { type Tag, type Model, type Schema } from '../../reader/Reader'
import path from 'path'
import Handlebars from 'handlebars'
import { getType, type PropertyType } from '../../reader/GetType'
import { definitionKind, enhanceApplication, enhanceModule, enhanceSchema, loadTemplate, shieldIoBadgeUrl } from '../WriterHelpers'
import { getModuleId, relativeLink } from '../../reader/InputHelper'
import { type Definition, type Property } from '../../schemaNormalizer/NormalizedSchema'

/** Options for the Markdown writer. */
export interface MarkdownWriterOptions extends WriterBaseOptions {
  /** Template for the application documentation */
  applicationTemplate: Handlebars.TemplateDelegate
  /** Template for the module documentation */
  moduleTemplate: Handlebars.TemplateDelegate
  /** Template for the schema documentation */
  schemaTemplate: Handlebars.TemplateDelegate
  /** Template for the subSchema documentation */
  subSchemaTemplate: Handlebars.TemplateDelegate
}

/**
 * Create a new Markdown writer. This writer will write a documentation of the model to the output folder in Markdown format.
 * @param outputFolder The folder to write the documentation to (required)
 * @param optionsOrUndefined Additional options for the writer (optional). If not provided, the default options will be used.
 * @returns The writer
 */
export function markdownWriter(outputFolder: string, optionsOrUndefined?: Partial<MarkdownWriterOptions>): Writer {
  return async function (model: Model): Promise<void> {
    const options = applyDefaults(outputFolder, optionsOrUndefined)
    registerHandlebarsHelpers(model, options)
    await writeSchemaFiles(model, options)
    await writeModuleFiles(model, options)
    await writeApplicationFile(model, options)
  }
}

function applyDefaults(outputFolder: string, options?: Partial<MarkdownWriterOptions>): MarkdownWriterOptions {
  return {
    ...applyWriterOptionsDefaults(outputFolder, options),
    schemaTemplate: options?.schemaTemplate ?? loadTemplate(path.join(__dirname, 'schema.hbs')),
    moduleTemplate: options?.moduleTemplate ?? loadTemplate(path.join(__dirname, 'module.hbs')),
    applicationTemplate: options?.applicationTemplate ?? loadTemplate(path.join(__dirname, 'application.hbs')),
    subSchemaTemplate: options?.subSchemaTemplate ?? loadTemplate(path.join(__dirname, 'subSchema.hbs')),
  }
}

function registerHandlebarsHelpers(model: Model, options: MarkdownWriterOptions): void {
  Handlebars.registerHelper('mdMultiline', (input: string) => mdMultiline(input))
  Handlebars.registerHelper('mdRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
  Handlebars.registerHelper('mdGetType', (schema: Schema, property: Property) => mdGetType(model, schema, property, options))
  Handlebars.registerHelper('mdGetProperty', (obj: Record<string, unknown> | undefined, property: string) => obj?.[property])
  Handlebars.registerHelper('mdHasElement', <T> (obj: T[] | undefined, element: T) => obj?.includes(element))
  Handlebars.registerHelper('mdJson', (input: unknown) => JSON.stringify(input, null, 2))
  Handlebars.registerHelper('mdAdditionalPropertyType', (schema: Schema, definition: Definition) => mdAdditionalPropertyType(model, schema, definition, options))
  Handlebars.registerHelper('mdBadge', (input: Tag) => `![Static Badge](${shieldIoBadgeUrl(input)})`)
  Handlebars.registerHelper('mdKind', (def: Definition) => definitionKind(def))
  Handlebars.registerPartial('mdSubSchema', options.subSchemaTemplate)
}

function mdMultiline(input?: string): string {
  if (input === undefined) return ''
  return input.split('\n').map(l => l.trim()).join('<br>')
}

function mdGetType(model: Model, schema: Schema, property: Property, options: MarkdownWriterOptions): string {
  const type = getType(model, schema, property)
  const result = mdGetTypeInternal(schema, type, options)
  if ('const' in property && property.const !== undefined) return `${result}<br>${JSON.stringify(property.const)}`
  return result
}

function mdGetTypeInternal(schema: Schema, type: PropertyType, options: MarkdownWriterOptions): string {
  switch (type.type) {
    case 'array': return `[${mdGetTypeInternal(schema, type.array, options)}]`
    case 'reference': return `[${type.name}](${relativeLink(getModuleId(schema), type.$id)}.md)`
    case 'self': return `[${type.name}](./)`
    case 'definition': return `[${type.name}](#${type.name})`
    case 'local':
      if (type.references) {
        return `References ${type.references.map(r => mdGetTypeInternal(schema, r, options)).join(', ')}`
      } else {
        return options.typeName(type.name)
      }
  }
}

function mdAdditionalPropertyType(model: Model, schema: Schema, definition: Definition, options: MarkdownWriterOptions): string {
  const additionalProperty = 'additionalProperties' in definition ? definition.additionalProperties ?? false : false
  if (additionalProperty === false) throw new Error('Additional properties are not enabled')
  if (additionalProperty === true) return '*'
  const propertyType = getType(model, schema, additionalProperty)
  return mdGetTypeInternal(schema, propertyType, options)
}

async function writeSchemaFiles(model: Model, options: MarkdownWriterOptions): Promise<void> {
  await Promise.all(model.schemas.map(async (schema) => {
    const context = enhanceSchema(model, schema)
    const output = options.schemaTemplate(context)
    await options.write(output, `${schema.$id}.md`)
  }))
}

async function writeModuleFiles(model: Model, options: MarkdownWriterOptions): Promise<void> {
  await Promise.all(model.modules.map(async (module) => {
    const context = enhanceModule(model, module)
    const output = options.moduleTemplate(context)
    await options.write(output, path.join(module.$id, 'README.md'))
  }))
}

async function writeApplicationFile(model: Model, options: MarkdownWriterOptions): Promise<void> {
  const context = enhanceApplication(model)
  const output = options.applicationTemplate(context)
  await options.write(output, 'README.md')
}
