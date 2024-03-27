import { type VerificationError, type Writer } from '../Writer'
import { type Property, type Schema, type Model } from '../../reader/Reader'
import path from 'path'
import Handlebars from 'handlebars'
import { getType, type PropertyType } from '../../reader/helper/GetType'
import { loadTemplate, writeOutput, enhanceApplication, enhanceModule, enhanceSchema } from '../WriterHelpers'
import { relativeLink } from '../../reader/helper/InputHelper'

export interface MarkdownWriterOptions {
  write: (output: string, relativeFilename: string) => Promise<void>
  applicationTemplate: Handlebars.TemplateDelegate
  moduleTemplate: Handlebars.TemplateDelegate
  schemaTemplate: Handlebars.TemplateDelegate
}

export function markdownWriter (outputFolder: string, options?: MarkdownWriterOptions): Writer {
  return async function (model: Model, verificationErrors: VerificationError[]): Promise<void> {
    Handlebars.registerHelper('mdMultiline', (input: string) => mdMultiline(input))
    Handlebars.registerHelper('mdRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
    Handlebars.registerHelper('mdGetType', (schema: Schema, property: Property) => mdGetType(schema, getType(model, schema, property)))
    Handlebars.registerHelper('mdGetProperty', (obj: any | undefined, property: string) => obj?.[property])
    Handlebars.registerHelper('mdHasValue', (obj: any[] | undefined, property: any) => obj?.includes(property))
    Handlebars.registerHelper('mdJson', (input: unknown) => JSON.stringify(input, null, 2))
    Handlebars.registerPartial('mdSubSchema', loadTemplate(path.join(__dirname, 'subSchema.hbs')))

    const schemaTemplate = options?.schemaTemplate ?? loadTemplate(path.join(__dirname, 'schema.hbs'))
    const moduleTemplate = options?.moduleTemplate ?? loadTemplate(path.join(__dirname, 'module.hbs'))
    const applicationTemplate = options?.applicationTemplate ?? loadTemplate(path.join(__dirname, 'application.hbs'))
    const write = options?.write ?? (async (o, f) => { await writeOutput(o, f, outputFolder) })

    for (const schema of model.schemas) {
      const context = enhanceSchema(model, schema, verificationErrors)
      const output = schemaTemplate(context)
      await write(output, `${schema.$id}.md`)
    }

    for (const module of model.modules) {
      const context = enhanceModule(model, module, verificationErrors)
      const output = moduleTemplate(context)
      await write(output, path.join(module.$id, 'README.md'))
    }

    const context = enhanceApplication(model, verificationErrors)
    const output = applicationTemplate(context)
    await write(output, 'README.md')
  }
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
