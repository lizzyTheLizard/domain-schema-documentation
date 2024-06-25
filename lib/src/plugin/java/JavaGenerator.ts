import { type ObjectDefinition, type EnumDefinition, type Schema, type Model, type Definition } from '../../reader/Model'
import { writeOutput } from '../../writer/WriterHelpers'
import { getDependencies } from '../../reader/helper/GetDependencies'
import Handlebars from 'handlebars'
import { type Generator } from '../Plugin'
import { type JavaPluginOptions } from './JavaPlugin'
import { getFullJavaClassName, getSimpleJavaClassName, getJavaPackageName, getJavaPropertyType } from './JavaHelper'
import { getType } from '../../reader/helper/GetType'
import { getModuleId } from '../../reader/helper/InputHelper'
import path from 'path'

type HandlebarsContext = Definition & { schema: Schema, definitionName?: string } & JavaPluginOptions

export function javaGenerator (outputFolder: string, options: JavaPluginOptions): Generator {
  return async (model: Model) => {
    Handlebars.registerHelper('javaPackageName', (ctx: HandlebarsContext) => getJavaPackageName(ctx.schema, options))
    Handlebars.registerHelper('javaComment', (text: string, indentation: number) => javaComment(text, indentation))
    Handlebars.registerHelper('javaClassName', (ctx: HandlebarsContext) => getSimpleJavaClassName(ctx.schema, ctx.definitionName))
    Handlebars.registerHelper('javaShortName', (name: string) => name.split('.').pop())
    Handlebars.registerHelper('javaEnumDoc', (ctx: HandlebarsContext, key: string) => javaEnumDoc(ctx as EnumDefinition, key))
    Handlebars.registerHelper('javaImplementedInterfaces', (ctx: HandlebarsContext) => implementedInterfaces(model, ctx.schema, options, ctx.definitionName))
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

function implementedInterfaces (model: Model, schema: Schema, options: JavaPluginOptions, definitionName?: string): string[] {
  return model.schemas.flatMap(s => getDependencies(model, s))
    .filter(d => d.type === 'IS_IMPLEMENTED_BY')
    .filter(d => d.toSchema === schema)
    .filter(d => d.toDefinitionName === definitionName)
    .map(d => getFullJavaClassName(d.fromSchema, options))
}

function collectImports (model: Model, schema: Schema, options: JavaPluginOptions, definitionName?: string): string[] {
  const definition = definitionName === undefined ? schema : schema.definitions[definitionName]
  const result: string[] = []
  if ('properties' in definition && options.useLombok) { result.push('lombok.*') }
  if ('properties' in definition) {
    Object.values(definition.properties).flatMap((property) => {
      const propertyType = getType(model, schema, property)
      return getJavaPropertyType(propertyType, schema, options).imports
    }).forEach(i => result.push(i))
  }
  implementedInterfaces(model, schema, options, definitionName).forEach(i => result.push(i))
  const packageName = getJavaPackageName(schema, options)
  return [...new Set(result)].filter(x => !isInPackage(x, packageName))
}

function isInPackage (fullClassName: string, packageName: string): boolean {
  return fullClassName.split('.').slice(0, -1).join('.') === packageName
}

const javaBasicTypes = new Map([['Short', 'short'], ['Integer', 'int'], ['Long', 'long'], ['Float', 'float'], ['Double', 'double'], ['Boolean', 'boolean'], ['Character', 'char']])

function propertyType (model: Model, schema: Schema, definiion: ObjectDefinition, propertyName: string, options: JavaPluginOptions): string {
  const property = definiion.properties[propertyName]
  const propertyType = getType(model, schema, property)
  const javaType = getJavaPropertyType(propertyType, schema, options)
  if (definiion.required.includes(propertyName)) {
    return javaBasicTypes.get(javaType.name) ?? javaType.name
  }
  return javaType.name
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

function javaEnumDoc (schema: EnumDefinition, key: string): string {
  return schema['x-enum-description']?.[key] ?? ''
}
