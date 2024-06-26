import { type VerificationError, type Writer } from '../Writer'
import { type Model, type Property, type Schema } from '../../reader/Reader'
import path from 'path'
import Handlebars from 'handlebars'
import { getType, type PropertyType } from '../../reader/helper/GetType'
import { enhanceApplication, enhanceModule, enhanceSchema, loadTemplate, writeOutput } from '../WriterHelpers'
import { relativeLink } from '../../reader/helper/InputHelper'

/** Options for the Markdown writer. */
export interface MarkdownWriterOptions {
  /** Write output to a single output file relativeFilename in the output dir */
  write: (output: string, relativeFilename: string) => Promise<void>
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
 * @param {string} outputFolder The folder to write the documentation to (required)
 * @param {MarkdownWriterOptions} optionsOrUndefined Additional options for the writer (optional)
 * @see MarkdownWriterOptions
 */
export function markdownWriter (outputFolder: string, optionsOrUndefined?: Partial<MarkdownWriterOptions>): Writer {
  return async function (model: Model, verificationErrors: VerificationError[]): Promise<void> {
    const options = applyDefaults(outputFolder, optionsOrUndefined)
    registerHandlebarsHelpers(model, options)
    await writeSchemaFiles(model, verificationErrors, options)
    await writeModuleFiles(model, verificationErrors, options)
    await writeApplicationFile(model, verificationErrors, options)
  }
}

function applyDefaults (outputFolder: string, options?: Partial<MarkdownWriterOptions>): MarkdownWriterOptions {
  return {
    schemaTemplate: options?.schemaTemplate ?? loadTemplate(path.join(__dirname, 'schema.hbs')),
    moduleTemplate: options?.moduleTemplate ?? loadTemplate(path.join(__dirname, 'module.hbs')),
    applicationTemplate: options?.applicationTemplate ?? loadTemplate(path.join(__dirname, 'application.hbs')),
    subSchemaTemplate: options?.subSchemaTemplate ?? loadTemplate(path.join(__dirname, 'subSchema.hbs')),
    write: options?.write ?? (async (o, f) => { await writeOutput(o, f, outputFolder) })
  }
}

function registerHandlebarsHelpers (model: Model, options: MarkdownWriterOptions): void {
  Handlebars.registerHelper('mdMultiline', (input: string) => mdMultiline(input))
  Handlebars.registerHelper('mdRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
  Handlebars.registerHelper('mdGetType', (schema: Schema, property: Property) => mdGetType(schema, getType(model, schema, property)))
  Handlebars.registerHelper('mdGetProperty', (obj: any | undefined, property: string) => obj?.[property])
  Handlebars.registerHelper('mdHasValue', (obj: any[] | undefined, property: any) => obj?.includes(property))
  Handlebars.registerHelper('mdJson', (input: unknown) => JSON.stringify(input, null, 2))
  Handlebars.registerPartial('mdSubSchema', options.subSchemaTemplate)
}

function mdMultiline (input: string): string {
  if (input === undefined) return ''
  return input.split('\n').map(l => l.trim()).join('<br>')
}

function mdGetType (schema: Schema, type: PropertyType): string {
  switch (type.type) {
    case 'array': return `[${mdGetType(schema, type.array)}]`
    case 'reference': return `[${type.name}](${relativeLink(path.dirname(schema.$id), type.$id)}.md)`
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

async function writeSchemaFiles (model: Model, verificationErrors: VerificationError[], options: MarkdownWriterOptions): Promise<void> {
  await Promise.all(model.schemas.map(async (schema) => {
    const context = enhanceSchema(model, schema, verificationErrors)
    const output = options.schemaTemplate(context)
    await options.write(output, `${schema.$id}.md`)
  }))
}

async function writeModuleFiles (model: Model, verificationErrors: VerificationError[], options: MarkdownWriterOptions): Promise<void> {
  await Promise.all(model.modules.map(async (module) => {
    const context = enhanceModule(model, module, verificationErrors)
    const output = options.moduleTemplate(context)
    await options.write(output, path.join(module.$id, 'README.md'))
  }))
}

async function writeApplicationFile (model: Model, verificationErrors: VerificationError[], options: MarkdownWriterOptions): Promise<void> {
  const context = enhanceApplication(model, verificationErrors)
  const output = options.applicationTemplate(context)
  await options.write(output, 'README.md')
}
