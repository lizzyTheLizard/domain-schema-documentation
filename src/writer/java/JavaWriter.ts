import { type Writer } from '../Writer.ts'
import { type EnumSchema, type Input, type Property, type Schema } from '../../reader/Reader.ts'
import { loadTemplate, type OutputOptions, writeOutputForSchema } from '../WriterHelper.ts'
import path from 'path'
import Handlebars from 'handlebars'

export function javaWriter (outputFolder: string): Writer {
  const outputOptions: OutputOptions = { fileEnding: '.java', outputFolder, subFolder: 'java' }
  const classTemplate = loadTemplate('src/writer/java/class.hbs')
  const enumTemplate = loadTemplate('src/writer/java/enum.hbs')
  Handlebars.registerHelper('javaComment', (text: string, indentation: number) => javaComment(text, indentation))
  Handlebars.registerHelper('javaClassName', (schema: Schema) => className(schema))
  Handlebars.registerHelper('javaEnumDoc', (schema: EnumSchema, key: string) => enumDoc(schema, key))
  Handlebars.registerHelper('javaPropertyType', (property: Property) => propertyType(property))

  return async function (input: Input): Promise<void> {
    await Promise.all([
      ...input.schemas.map(async s => { await writeJava(s) })
    ])
  }

  async function writeJava (schema: Schema): Promise<void> {
    if (schema.type === 'object') {
      // TODO Implement template and test
      const output = classTemplate({ ...schema, imports: getImports(schema) })
      await writeOutputForSchema(output, schema, outputOptions)
    } else {
      // TODO Implement template and test
      const output = enumTemplate(schema)
      await writeOutputForSchema(output, schema, outputOptions)
    }
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

  function enumDoc (schema: EnumSchema, key: string): string {
    return schema['x-enum-description']?.[key] ?? ''
  }

  function propertyType (_: Property): string {
    // TODO: Implement type mapping
    return 'String'
  }

  function getImports (_: Schema): string[] {
    // TODO: Implement type mapping
    return []
  }
}
