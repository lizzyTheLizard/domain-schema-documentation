import { type Writer } from '../Writer.ts'
import { type Property, type Schema, type Model } from '../../reader/Reader.ts'
import path from 'path'
import { type Plugin } from '../../plugin/Plugin.ts'
import Handlebars from 'handlebars'
import { getType, type PropertyType } from '../../reader/helper/GetType.ts'
import { loadTemplate, writeOutput, enhanceApplication, enhanceModule, enhanceSchema, executePlugins } from '../WriterHelpers.ts'
import { relativeLink } from '../../reader/helper/InputHelper.ts'

export function markdownWriter (
  outputFolder: string,
  plugins: Plugin[] = [],
  write: (output: string, relativeFilename: string) => Promise<void> = async (o, f) => { await writeOutput(o, f, outputFolder) },
  applicationTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/markdown/application.hbs'),
  moduleTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/markdown/module.hbs'),
  schemaTemplate: HandlebarsTemplateDelegate = loadTemplate('src/writer/markdown/schema.hbs')
): Writer {
  return async function (model: Model): Promise<void> {
    Handlebars.registerHelper('mdMultiline', (input: string) => mdMultiline(input))
    Handlebars.registerHelper('mdRelativeLink', (fromId: string, toId: string) => relativeLink(fromId, toId))
    Handlebars.registerHelper('mdGetType', (schema: Schema, property: Property) => mdGetType(schema, getType(model, schema, property)))
    Handlebars.registerHelper('mdGetProperty', (obj: any | undefined, property: string) => obj?.[property])
    Handlebars.registerHelper('mdHasValue', (obj: any[] | undefined, property: any) => obj?.includes(property))
    Handlebars.registerHelper('mdJson', (input: unknown) => JSON.stringify(input, null, 2))
    Handlebars.registerPartial('mdSubSchema', loadTemplate('src/writer/markdown/subSchema.hbs'))

    const verificationErrors = await executePlugins(outputFolder, model, plugins)

    for (const schema of model.schemas) {
      const context = enhanceSchema(model, schema, plugins, verificationErrors)
      const output = schemaTemplate(context)
      await write(output, `${schema.$id}.md`)
    }

    for (const module of model.modules) {
      const context = enhanceModule(model, module, plugins, verificationErrors)
      const output = moduleTemplate(context)
      await write(output, path.join(module.$id, 'README.md'))
    }

    const context = enhanceApplication(model, plugins, verificationErrors)
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
