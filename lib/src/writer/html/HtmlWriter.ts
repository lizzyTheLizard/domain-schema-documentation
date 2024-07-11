import { type Writer } from '../Writer'
import { type Definition, type Model, type Property, type Schema } from '../../reader/Reader'
import path from 'path'
import { enhanceApplication, enhanceModule, enhanceSchema, loadTemplate, writeOutput } from '../WriterHelpers'
import Handlebars from 'handlebars'
import { relativeLink } from '../../reader/helper/InputHelper'
import { getType, type PropertyType } from '../../reader/helper/GetType'

/** Options for the HTML writer. */
export interface HtmlWriterOptions {
  /** Write output to a single output file relativeFilename in the output dir */
  write: (output: string, relativeFilename: string) => Promise<void>
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
export function htmlWriter (outputFolder: string, optionsOrUndefined?: Partial<HtmlWriterOptions>): Writer {
  return async function (model: Model): Promise<void> {
    const options = applyDefaults(outputFolder, optionsOrUndefined)
    registerHandlebarsHelpers(model, options)
    await writeSchemaFiles(model, options)
    await writeModuleFiles(model, options)
    await writeApplicationFile(model, options)
  }
}

function applyDefaults (outputFolder: string, options?: Partial<HtmlWriterOptions>): HtmlWriterOptions {
  return {
    schemaTemplate: options?.schemaTemplate ?? loadTemplate(path.join(__dirname, 'schema.hbs')),
    moduleTemplate: options?.moduleTemplate ?? loadTemplate(path.join(__dirname, 'module.hbs')),
    applicationTemplate: options?.applicationTemplate ?? loadTemplate(path.join(__dirname, 'application.hbs')),
    basicTemplate: options?.basicTemplate ?? loadTemplate(path.join(__dirname, 'basic.hbs')),
    write: options?.write ?? (async (o, f) => { await writeOutput(o, f, outputFolder) }),
    subSchemaTemplate: options?.subSchemaTemplate ?? loadTemplate(path.join(__dirname, 'subSchema.hbs'))
  }
}

function registerHandlebarsHelpers (model: Model, options: HtmlWriterOptions): void {
  Handlebars.registerHelper('htmlRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
  Handlebars.registerHelper('htmlGetProperty', (obj: any | undefined, property: string) => obj?.[property])
  Handlebars.registerHelper('htmlHasProperty', (obj: any[] | undefined, property: any) => obj?.includes(property))
  Handlebars.registerHelper('htmlJson', (input: unknown) => JSON.stringify(input))
  Handlebars.registerHelper('htmlGetType', (schema: Schema, property: Property) => htmlGetType(schema, getType(model, schema, property)))
  Handlebars.registerHelper('htmlIntent', (input: string, intent: number) => input.split('\n').map(l => ' '.repeat(intent) + l).join('\n'))
  Handlebars.registerHelper('htmlAdditionalPropertyType', (schema: Schema, definition: Definition) => htmlAdditionalPropertyType(model, schema, definition))
  Handlebars.registerPartial('htmlSubSchema', options.subSchemaTemplate)
}

function htmlGetType (schema: Schema, type: PropertyType): string {
  switch (type.type) {
    case 'array': return `[${htmlGetType(schema, type.array)}]`
    case 'reference': return `<a href="${relativeLink(path.dirname(schema.$id), type.$id)}.html">${type.name}</a>`
    case 'self': return `<a href="">${type.name}</a>`
    case 'definition': return `<a href="#${type.name}">${type.name}</a>`
    case 'local':
      if (type.references) {
        return `References ${type.references.map(r => htmlGetType(schema, r)).join(', ')}`
      } else {
        return type.name
      }
  }
}

function htmlAdditionalPropertyType (model: Model, schema: Schema, definition: Definition): string {
  const addionalProperties = 'additionalProperties' in definition ? definition.additionalProperties ?? false : false
  if (addionalProperties === false) throw new Error('Additional properties are not enabled')
  if (addionalProperties === true) return '*'
  const propertyType = getType(model, schema, addionalProperties)
  return htmlGetType(schema, propertyType)
}

async function writeSchemaFiles (model: Model, options: HtmlWriterOptions): Promise<void> {
  await Promise.all(model.schemas.map(async (schema) => {
    const context = enhanceSchema(model, schema)
    const output1 = options.schemaTemplate(context)
    const output2 = options.basicTemplate({ content: output1, title: schema.title })
    await options.write(output2, `${schema.$id}.html`)
  }))
}

async function writeModuleFiles (model: Model, options: HtmlWriterOptions): Promise<void> {
  await Promise.all(model.modules.map(async (module) => {
    const context = enhanceModule(model, module)
    const output1 = options.moduleTemplate(context)
    const output2 = options.basicTemplate({ content: output1, title: module.title })
    await options.write(output2, path.join(module.$id, 'index.html'))
  }))
}

async function writeApplicationFile (model: Model, options: HtmlWriterOptions): Promise<void> {
  const context = enhanceApplication(model)
  const output1 = options.applicationTemplate(context)
  const output2 = options.basicTemplate({ content: output1, title: model.application.title })
  await options.write(output2, 'index.html')
}
