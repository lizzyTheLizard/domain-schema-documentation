import { type VerificationError, type Writer } from '../Writer.ts'
import { type Model, type Property, type Schema } from '../../reader/Reader.ts'
import path from 'path'
import { loadTemplate, writeOutput, enhanceApplication, enhanceModule, enhanceSchema } from '../WriterHelpers.ts'
import Handlebars from 'handlebars'
import { relativeLink } from '../../reader/helper/InputHelper.ts'
import { getType, type PropertyType } from '../../reader/helper/GetType.ts'

export interface HtmlWriterOptions {
  write: (output: string, relativeFilename: string) => Promise<void>
  basicTemplate: HandlebarsTemplateDelegate
  applicationTemplate: HandlebarsTemplateDelegate
  moduleTemplate: HandlebarsTemplateDelegate
  schemaTemplate: HandlebarsTemplateDelegate
}

export function htmlWriter (outputFolder: string, options?: HtmlWriterOptions): Writer {
  return async function (model: Model, verificationErrors: VerificationError[]): Promise<void> {
    Handlebars.registerHelper('htmlRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
    Handlebars.registerHelper('htmlGetProperty', (obj: any | undefined, property: string) => obj?.[property])
    Handlebars.registerHelper('htmlHasProperty', (obj: any[] | undefined, property: any) => obj?.includes(property))
    Handlebars.registerHelper('htmlJson', (input: unknown) => JSON.stringify(input))
    Handlebars.registerHelper('htmlGetType', (schema: Schema, property: Property) => htmlGetType(schema, getType(model, schema, property)))
    Handlebars.registerHelper('htmlIntent', (input: string, intent: number) => input.split('\n').map(l => ' '.repeat(intent) + l).join('\n'))
    Handlebars.registerPartial('htmlSubSchema', loadTemplate('src/writer/html/subSchema.hbs'))

    const schemaTemplate = options?.schemaTemplate ?? loadTemplate('src/writer/html/schema.hbs')
    const moduleTemplate = options?.moduleTemplate ?? loadTemplate('src/writer/html/module.hbs')
    const applicationTemplate = options?.applicationTemplate ?? loadTemplate('src/writer/html/application.hbs')
    const basicTemplate = options?.basicTemplate ?? loadTemplate('src/writer/html/basic.hbs')
    const write = options?.write ?? (async (o, f) => { await writeOutput(o, f, outputFolder) })

    for (const schema of model.schemas) {
      const context = enhanceSchema(model, schema, verificationErrors)
      const output1 = schemaTemplate(context)
      const output2 = basicTemplate({ content: output1, title: schema.title })
      await write(output2, `${schema.$id}.html`)
    }

    for (const module of model.modules) {
      const context = enhanceModule(model, module, verificationErrors)
      const output1 = moduleTemplate(context)
      const output2 = basicTemplate({ content: output1, title: module.title })
      await write(output2, path.join(module.$id, 'index.html'))
    }

    const context = enhanceApplication(model, verificationErrors)
    const output1 = applicationTemplate(context)
    const output2 = basicTemplate({ content: output1, title: model.application.title })
    await write(output2, 'index.html')
  }
}

function htmlGetType (schema: Schema, type: PropertyType): string {
  switch (type.type) {
    case 'array': return `[${htmlGetType(schema, type.array)}]`
    case 'reference': return `<a href="${relativeLink(path.dirname(schema.$id), type.$id)}.html">${type.name}</a>`
    case 'self': return `<a href="./">${type.name}</a>`
    case 'definition': return `<a href="#${type.name}">${type.name}</a>`
    case 'local':
      if (type.references) {
        return `References ${type.references.map(r => htmlGetType(schema, r)).join(', ')}`
      } else {
        return type.name
      }
  }
}
