import { type Plugin, type VerificationError } from '../Plugin.ts'
import path from 'path'
import Handlebars from 'handlebars'
import { loadTemplate, writeOutput } from '../../writer/WriterHelpers.ts'
import {
  type EnumDefinition,
  type Property,
  type Schema,
  type Model
} from '../../reader/Reader.ts'

const classTemplate = loadTemplate('src/plugin/java/class.hbs')
const enumTemplate = loadTemplate('src/plugin/java/enum.hbs')

export function javaPlugin (outputFolder: string): Plugin {
  return {
    validate: async () => await validateJava(),
    generateOutput: async (model) => { await generateJavaOutput(model, outputFolder) },
    getModuleLinks: () => [{ text: 'Java-Files', href: './java' }],
    getSchemaLinks: (schema: Schema) => [{ text: 'Java-File', href: `.${getFileName(schema)}` }]
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

function javaComment (text: string, intendation: number): string {
  const intendString = ' '.repeat(intendation)
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
