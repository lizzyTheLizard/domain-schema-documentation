import { type Writer, applyWriterOptionsDefaults, type WriterBaseOptions } from '../Writer'
import { type Tag, type Model, type Schema } from '../../reader/Reader'
import path from 'path'
import { definitionKind, enhanceApplication, enhanceModule, enhanceSchema, loadTemplate, shieldIoBadgeUrl } from '../WriterHelpers'
import Handlebars from 'handlebars'
import { getModuleId, relativeLink } from '../../reader/InputHelper'
import { getType, type PropertyType } from '../../reader/GetType'
import { type Definition, type Property } from '../../schemaNormalizer/NormalizedSchema'

/** Options for the HTML writer. */
export interface HtmlWriterOptions extends WriterBaseOptions {
  /** Template for the mail HTML-Template. All the files will use this template */
  basicTemplate: Handlebars.TemplateDelegate
  /** Template for the application documentation */
  applicationTemplate: Handlebars.TemplateDelegate
  /** Template for the module documentation */
  moduleTemplate: Handlebars.TemplateDelegate
  /** Template for the schema documentation */
  schemaTemplate: Handlebars.TemplateDelegate
  /** Template for the sub-schema documentation */
  subSchemaTemplate: Handlebars.TemplateDelegate
}

/**
 * Create a new HTML writer. This writer will write a documentation of the model to the output folder in HTML format.
 * @param outputFolder The folder to write the documentation to (required)
 * @param optionsOrUndefined Additional options for the writer (optional). If not provided, the default options will be used.
 * @returns The writer
 */
export function htmlWriter(outputFolder: string, optionsOrUndefined?: Partial<HtmlWriterOptions>): Writer {
  return async function (model: Model): Promise<void> {
    const options = applyDefaults(outputFolder, optionsOrUndefined)
    registerHandlebarsHelpers(model, options)
    await writeSchemaFiles(model, options)
    await writeModuleFiles(model, options)
    await writeApplicationFile(model, options)
  }
}

function applyDefaults(outputFolder: string, options?: Partial<HtmlWriterOptions>): HtmlWriterOptions {
  return {
    ...applyWriterOptionsDefaults(outputFolder, options),
    schemaTemplate: options?.schemaTemplate ?? loadTemplate(path.join(__dirname, 'schema.hbs')),
    moduleTemplate: options?.moduleTemplate ?? loadTemplate(path.join(__dirname, 'module.hbs')),
    applicationTemplate: options?.applicationTemplate ?? loadTemplate(path.join(__dirname, 'application.hbs')),
    subSchemaTemplate: options?.subSchemaTemplate ?? loadTemplate(path.join(__dirname, 'subSchema.hbs')),
    basicTemplate: options?.basicTemplate ?? loadTemplate(path.join(__dirname, 'basic.hbs')),
  }
}

function registerHandlebarsHelpers(model: Model, options: HtmlWriterOptions): void {
  Handlebars.registerHelper('htmlRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
  Handlebars.registerHelper('htmlGetProperty', (obj: Record<string, unknown> | undefined, property: string) => obj?.[property])
  Handlebars.registerHelper('htmlHasElement', <T> (obj: T[] | undefined, element: T) => obj?.includes(element))
  Handlebars.registerHelper('htmlJson', (input: unknown) => JSON.stringify(input))
  Handlebars.registerHelper('htmlGetType', (schema: Schema, property: Property) => htmlGetType(model, schema, property, options))
  Handlebars.registerHelper('htmlIntent', (input: string, intent: number) => input.split('\n').map(l => ' '.repeat(intent) + l).join('\n'))
  Handlebars.registerHelper('htmlAdditionalPropertyType', (schema: Schema, definition: Definition) => htmlAdditionalPropertyType(model, schema, definition, options))
  Handlebars.registerHelper('htmlBadge', (input: Tag) => `<img alt="Static Badge" src="${shieldIoBadgeUrl(input)}">`)
  Handlebars.registerHelper('htmlKind', (def: Definition) => definitionKind(def))
  Handlebars.registerPartial('htmlSubSchema', options.subSchemaTemplate)
}

function htmlGetType(model: Model, schema: Schema, property: Property, options: HtmlWriterOptions): string {
  const type = getType(model, schema, property)
  const result = htmlGetTypeInternal(schema, type, options)
  if ('const' in property && property.const !== undefined) return `${result}<br>${JSON.stringify(property.const)}`
  return result
}

function htmlGetTypeInternal(schema: Schema, type: PropertyType, options: HtmlWriterOptions): string {
  switch (type.type) {
    case 'array': return `[${htmlGetTypeInternal(schema, type.array, options)}]`
    case 'reference': return `<a href="${relativeLink(getModuleId(schema), type.$id)}.html">${type.name}</a>`
    case 'self': return `<a href="">${type.name}</a>`
    case 'definition': return `<a href="#${type.name}">${type.name}</a>`
    case 'local':
      if (type.references) {
        return `References ${type.references.map(r => htmlGetTypeInternal(schema, r, options)).join(', ')}`
      } else {
        return options.typeName(type.name)
      }
  }
}

function htmlAdditionalPropertyType(model: Model, schema: Schema, definition: Definition, options: HtmlWriterOptions): string {
  const addionalProperties = 'additionalProperties' in definition ? definition.additionalProperties : false
  if (addionalProperties === false) throw new Error('Additional properties are not enabled')
  if (addionalProperties === true) return '*'
  const propertyType = getType(model, schema, addionalProperties)
  return htmlGetTypeInternal(schema, propertyType, options)
}

async function writeSchemaFiles(model: Model, options: HtmlWriterOptions): Promise<void> {
  await Promise.all(model.schemas.map(async (schema) => {
    const context = enhanceSchema(model, schema)
    const output1 = options.schemaTemplate(context)
    const output2 = options.basicTemplate({ content: output1, title: schema.title })
    await options.write(output2, `${schema.$id}.html`)
  }))
}

async function writeModuleFiles(model: Model, options: HtmlWriterOptions): Promise<void> {
  await Promise.all(model.modules.map(async (module) => {
    const context = enhanceModule(model, module)
    const output1 = options.moduleTemplate(context)
    const output2 = options.basicTemplate({ content: output1, title: module.title })
    await options.write(output2, path.join(module.$id, 'index.html'))
  }))
}

async function writeApplicationFile(model: Model, options: HtmlWriterOptions): Promise<void> {
  const context = enhanceApplication(model)
  const output1 = options.applicationTemplate(context)
  const output2 = options.basicTemplate({ content: output1, title: model.application.title })
  await options.write(output2, 'index.html')
}
