import { type Plugin } from '../Plugin'
import path from 'path'
import Handlebars from 'handlebars'
import { loadTemplate, writeOutput } from '../../writer/WriterHelpers'
import {
  type EnumDefinition,
  type Property,
  type Schema,
  type Model
} from '../../reader/Reader'
import { type VerificationError } from '../../writer/Writer'

const classTemplate = loadTemplate(path.join(__dirname, 'class.hbs'))
const enumTemplate = loadTemplate(path.join(__dirname, 'enum.hbs'))

export function javaPlugin (outputFolder: string): Plugin {
  return {
    updateModel: async (model) => addLinks(model),
    validate: async () => await validateJava(),
    generateOutput: async (model) => { await generateJavaOutput(model, outputFolder) }
  }
}

function addLinks (model: Model): Model {
  return {
    application: model.application,
    modules: model.modules.map(m => ({ ...m, links: [...m.links ?? [], { text: 'Java-Files', href: './java' }] })),
    schemas: model.schemas.map(s => ({ ...s, 'x-links': [...s['x-links'] ?? [], { text: 'Java-File', href: `.${getFileName(s)}` }] }))
  }
}

async function validateJava (): Promise<VerificationError[]> {
  return []
}

async function generateJavaOutput (model: Model, outputFolder: string): Promise<void> {
  Handlebars.registerHelper('javaComment', (text: string, indentation: number) => javaComment(text, indentation))
  Handlebars.registerHelper('javaClassName', (schema: Schema) => className(schema))
  Handlebars.registerHelper('javaEnumDoc', (schema: EnumDefinition, key: string) => enumDoc(schema, key))
  Handlebars.registerHelper('javaPropertyType', (property: Property) => propertyType(property))

  for (const schema of model.schemas) {
    const relativeFilename = path.join(path.dirname(schema.$id), getFileName(schema))
    if (schema.type === 'object') {
      // TODO Implement template and test
      const output = classTemplate({ ...schema, imports: getImports(schema) })
      await writeOutput(output, relativeFilename, outputFolder)
    } else {
      // TODO Implement template and test
      const output = enumTemplate(schema)
      await writeOutput(output, relativeFilename, outputFolder)
    }
  }
}

function getFileName (schema: Schema): string {
  return `/java/${path.basename(schema.$id).replace(path.extname(schema.$id), '.java')}`
}

function javaComment (text: string, indentation: number): string {
  const intendString = ' '.repeat(indentation)
  if (text.includes('\n')) {
    const split = text.trim().split('\n')
    return `${intendString}/* ${split.join('\n' + intendString)} */`
  } else {
    return `${intendString}// ${text}`
  }
}

function className (schema: Schema): string {
  return path.basename(schema.$id).replace(path.extname(schema.$id), '')
}

function enumDoc (schema: EnumDefinition, key: string): string {
  return schema['x-enum-description']?.[key] ?? ''
}

function propertyType (_: Property): string {
  // TODO: Implement type mapping
  return 'String'
}

function getImports (_: Property | Schema): string[] {
  // TODO: Implement type mapping
  return []
}
