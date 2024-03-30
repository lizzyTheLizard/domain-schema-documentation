import { type VerificationError, type Writer } from '../Writer'
import { type Model, type Property, type Schema } from '../../reader/Model'
import path from 'path'
import {
  enhanceApplication,
  enhanceModule,
  enhanceSchema,
  loadTemplate,
  writeOutput
} from '../WriterHelpers'
import Handlebars from 'handlebars'
import { relativeLink } from '../../reader/helper/InputHelper'
import { getType, type PropertyType } from '../../reader/helper/GetType'
import { type HtmlWriterOptions } from './HtmlWriterOptions'

/**
 * Create a new HTML writer. This writer will write a documentation of the model to the output folder in HTML format.
 * @param {string} outputFolder The folder to write the documentation to (required)
 * @param {HtmlWriterOptions} optionsOrUndefined Additional options for the writer (optional)
 * @see HtmlWriterOptions
 */
export function htmlWriter (outputFolder: string, optionsOrUndefined?: Partial<HtmlWriterOptions>): Writer {
  return async function (model: Model, verificationErrors: VerificationError[]): Promise<void> {
    const options = applyDefaults(outputFolder, optionsOrUndefined)
    registerHandlebarsHelpers(model)
    await writeSchemaFiles(model, verificationErrors, options)
    await writeModuleFiles(model, verificationErrors, options)
    await writeApplicationFile(model, verificationErrors, options)
  }
}

function applyDefaults (outputFolder: string, options?: Partial<HtmlWriterOptions>): HtmlWriterOptions {
  return {
    schemaTemplate: options?.schemaTemplate ?? loadTemplate(path.join(__dirname, 'schema.hbs')),
    moduleTemplate: options?.moduleTemplate ?? loadTemplate(path.join(__dirname, 'module.hbs')),
    applicationTemplate: options?.applicationTemplate ?? loadTemplate(path.join(__dirname, 'application.hbs')),
    basicTemplate: options?.basicTemplate ?? loadTemplate(path.join(__dirname, 'basic.hbs')),
    write: options?.write ?? (async (o, f) => { await writeOutput(o, f, outputFolder) })
  }
}

function registerHandlebarsHelpers (model: Model): void {
  Handlebars.registerHelper('htmlRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
  Handlebars.registerHelper('htmlGetProperty', (obj: any | undefined, property: string) => obj?.[property])
  Handlebars.registerHelper('htmlHasProperty', (obj: any[] | undefined, property: any) => obj?.includes(property))
  Handlebars.registerHelper('htmlJson', (input: unknown) => JSON.stringify(input))
  Handlebars.registerHelper('htmlGetType', (schema: Schema, property: Property) => htmlGetType(schema, getType(model, schema, property)))
  Handlebars.registerHelper('htmlIntent', (input: string, intent: number) => input.split('\n').map(l => ' '.repeat(intent) + l).join('\n'))
  Handlebars.registerPartial('htmlSubSchema', loadTemplate(path.join(__dirname, 'subSchema.hbs')))
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

async function writeSchemaFiles (model: Model, verificationErrors: VerificationError[], options: HtmlWriterOptions): Promise<void> {
  await Promise.all(model.schemas.map(async (schema) => {
    const context = enhanceSchema(model, schema, verificationErrors)
    const output1 = options.schemaTemplate(context)
    const output2 = options.basicTemplate({ content: output1, title: schema.title })
    await options.write(output2, `${schema.$id}.html`)
  }))
}

async function writeModuleFiles (model: Model, verificationErrors: VerificationError[], options: HtmlWriterOptions): Promise<void> {
  await Promise.all(model.modules.map(async (module) => {
    const context = enhanceModule(model, module, verificationErrors)
    const output1 = options.moduleTemplate(context)
    const output2 = options.basicTemplate({ content: output1, title: module.title })
    await options.write(output2, path.join(module.$id, 'index.html'))
  }))
}

async function writeApplicationFile (model: Model, verificationErrors: VerificationError[], options: HtmlWriterOptions): Promise<void> {
  const context = enhanceApplication(model, verificationErrors)
  const output1 = options.applicationTemplate(context)
  const output2 = options.basicTemplate({ content: output1, title: model.application.title })
  await options.write(output2, 'index.html')
}
