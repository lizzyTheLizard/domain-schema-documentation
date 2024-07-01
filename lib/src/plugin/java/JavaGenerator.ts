import { type ObjectDefinition, type EnumDefinition, type Schema, type Model, type Definition } from '../../reader/Reader'
import { writeOutput } from '../../writer/WriterHelpers'
import { getDependencies } from '../../reader/helper/GetDependencies'
import Handlebars from 'handlebars'
import { type Generator } from '../Plugin'
import { type JavaPluginOptions } from './JavaPlugin'
import { getFullJavaClassName, getSimpleJavaClassName, getJavaPackageName, getJavaPropertyType, type JavaType } from './JavaHelper'
import { getModuleId } from '../../reader/helper/InputHelper'
import path from 'path'

type HandlebarsContext = Definition & { schema: Schema, definitionName?: string } & JavaPluginOptions

/**
 * Generator for Java files
 * @param outputFolder The folder to write the output to. Should be the same as the output folder of the writer.
 * @param options Options, @see JavaPluginOptions
 */
export function javaGenerator (outputFolder: string, options: JavaPluginOptions): Generator {
  return async (model: Model) => {
    Handlebars.registerHelper('javaPackageName', (ctx: HandlebarsContext) => getJavaPackageName(ctx.schema, options))
    Handlebars.registerHelper('javaComment', (text: string, indentation: number) => comment(text, indentation))
    Handlebars.registerHelper('javaClassName', (ctx: HandlebarsContext) => getSimpleJavaClassName(ctx.schema, ctx.definitionName))
    Handlebars.registerHelper('javaEnumDoc', (ctx: HandlebarsContext, key: string) => enumDoc(ctx as EnumDefinition, key))
    Handlebars.registerHelper('javaImplementedInterfaces', (ctx: HandlebarsContext) => implementedInterfaces(model, ctx.schema, ctx.definitionName).map(s => getSimpleJavaClassName(s)))
    Handlebars.registerHelper('javaPropertyType', (ctx: HandlebarsContext, propertyName: string) => propertyType(model, ctx.schema, ctx as ObjectDefinition, propertyName, options))
    Handlebars.registerHelper('javaImports', (ctx: HandlebarsContext) => collectImports(model, ctx.schema, options, ctx.definitionName))

    for (const schema of model.schemas) {
      const output = await generate(schema, options)
      const fileName = path.join(getModuleId(schema), 'java', getSimpleJavaClassName(schema) + '.java')
      await writeOutput(output, fileName, outputFolder)
      for (const definitionName in schema.definitions) {
        const outputD = await generate(schema, options, definitionName)
        const fileNameD = path.join(getModuleId(schema), 'java', getSimpleJavaClassName(schema, definitionName) + '.java')
        await writeOutput(outputD, fileNameD, outputFolder)
      }
    }
  }
}

async function generate (schema: Schema, options: JavaPluginOptions, definitionName?: string): Promise<string> {
  const definition = definitionName === undefined ? schema : schema.definitions[definitionName]
  if (definition.type === 'object' && 'properties' in definition) {
    return options.classTemplate({ ...definition, ...options, schema, definitionName })
  } else if (definition.type === 'object') {
    return options.interfaceTemplate({ ...definition, ...options, schema, definitionName })
  } else {
    return options.enumTemplate({ ...definition, ...options, schema, definitionName })
  }
}

function implementedInterfaces (model: Model, schema: Schema, definitionName?: string): Schema[] {
  return model.schemas.flatMap(s => getDependencies(model, s))
    .filter(d => d.type === 'IS_IMPLEMENTED_BY')
    .filter(d => d.toSchema === schema)
    .filter(d => d.toDefinitionName === definitionName)
    .map(d => d.fromSchema)
}

function collectImports (model: Model, schema: Schema, options: JavaPluginOptions, definitionName?: string): string[] {
  const definition = definitionName === undefined ? schema : schema.definitions[definitionName]
  const result: string[] = []
  if ('properties' in definition && options.useLombok) { result.push('lombok.*') }
  if ('properties' in definition) {
    Object.values(definition.properties).flatMap((property) => {
      const type = getJavaPropertyType(model, schema, property, options)
      return collectImportsFromType(type)
    }).forEach(i => result.push(i))
  }
  implementedInterfaces(model, schema, definitionName).forEach(i => result.push(getFullJavaClassName(i, options)))
  const packageName = getJavaPackageName(schema, options)
  function isInPackage (fullClassName: string, packageName: string): boolean {
    return fullClassName.split('.').slice(0, -1).join('.') === packageName
  }
  return [...new Set(result)].filter(x => !isInPackage(x, packageName)).filter(x => x.includes('.'))
}

function collectImportsFromType (type: JavaType): string[] {
  switch (type.type) {
    case 'CLASS': return [type.fullName]
    case 'COLLECTION': return [...collectImportsFromType(type.items), 'java.util.Collection']
  }
}

const javaBasicTypes = new Map([['Short', 'short'], ['Integer', 'int'], ['Long', 'long'], ['Float', 'float'], ['Double', 'double'], ['Boolean', 'boolean'], ['Character', 'char']])

function propertyType (model: Model, schema: Schema, definition: ObjectDefinition, propertyName: string, options: JavaPluginOptions): string {
  const property = definition.properties[propertyName]
  const javaType = getJavaPropertyType(model, schema, property, options)
  const simpleName = getSimpleClassNameFromType(javaType)
  if (definition.required.includes(propertyName)) {
    return javaBasicTypes.get(simpleName) ?? simpleName
  }
  return simpleName
}

function getSimpleClassNameFromType (type: JavaType): string {
  switch (type.type) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    case 'CLASS': return type.fullName.split('.').pop()!
    case 'COLLECTION': return `Collection<${getSimpleClassNameFromType(type.items)}>`
  }
}

function comment (text: string, indentation: number): string {
  const intendString = ' '.repeat(indentation)
  if (text.includes('\n')) {
    const split = text.trim().split('\n')
    return `${intendString}/* ${split.join('\n' + intendString)} */`
  } else {
    return `${intendString}// ${text}`
  }
}

function enumDoc (schema: EnumDefinition, key: string): string {
  return schema['x-enum-description']?.[key] ?? ''
}
