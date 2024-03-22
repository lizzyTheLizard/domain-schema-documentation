import { type Application, type Model, type Module, type Schema } from '../reader/Reader.ts'
import { type Plugin, type VerificationError } from '../plugin/Plugin.ts'
import { applicationDiagram, moduleDiagram, schemaDiagramm } from './MermaidDiagramGenerator.ts'
import path from 'path'
import fs from 'fs'
import Handlebars from 'handlebars'
import { getModuleForSchema } from '../reader/helper/InputHelper.ts'

export async function executePlugins (outputFolder: string, model: Model, plugins: Plugin[]): Promise<VerificationError[]> {
  for (const plugin of plugins) {
    await plugin.generateOutput?.(outputFolder, model)
  }
  const errors = await Promise.all(plugins.map(async p => await p.validate?.(model) ?? []))
  return errors.flatMap(e => e)
}

export type EnhancedSchema = Schema & {
  hasDefinitions: boolean
  classDiagram: string
  errors: VerificationError[]
  module: Module
}

export function enhanceSchema (model: Model, schema: Schema, plugins: Plugin[], verificationErrors: VerificationError[]): EnhancedSchema {
  const errors = verificationErrors.filter(e => 'schema' in e && e.schema === schema)
  return {
    ...schema,
    hasDefinitions: Object.keys(schema.definitions).length !== 0,
    'x-links': [...schema['x-links'] ?? [], ...plugins.flatMap(p => p.getSchemaLinks?.(schema) ?? [])],
    'x-todos': [...schema['x-todos'] ?? [], ...getErrorTodos(errors)],
    classDiagram: schemaDiagramm(model, schema),
    errors,
    module: getModuleForSchema(model, schema)
  }
}

export type EnhancedModule = Module & {
  classDiagram: string
  errors: VerificationError[]
  schemas: Schema[]
}

export function enhanceModule (model: Model, module: Module, plugins: Plugin[], verificationErrors: VerificationError[]): EnhancedModule {
  const errors = verificationErrors.filter(e => 'module' in e && e.module === module)
  return {
    ...module,
    'x-links': [...module['x-links'] ?? [], ...plugins.flatMap(p => p.getModuleLinks?.(module) ?? [])],
    'x-todos': [...module['x-todos'] ?? [], ...getErrorTodos(errors)],
    errors,
    classDiagram: moduleDiagram(model, module),
    schemas: model.schemas.filter(s => s.$id.startsWith(module.$id))
  }
}

export type EnhancedApplication = Application & {
  classDiagram: string
  errors: VerificationError[]
  modules: Module[]
}

export function enhanceApplication (model: Model, plugins: Plugin[], verificationErrors: VerificationError[]): EnhancedApplication {
  const application = model.application
  const errors = verificationErrors.filter(e => 'application' in e && e.application === application)
  return {
    ...application,
    'x-links': [...application['x-links'] ?? [], ...plugins.flatMap(p => p.getApplicationLinks?.(application) ?? [])],
    'x-todos': [...application['x-todos'] ?? [], ...getErrorTodos(errors)],
    errors,
    classDiagram: applicationDiagram(model),
    modules: model.modules
  }
}

function getErrorTodos (error: VerificationError[]): string[] {
  if (error.length === 0) return []
  if (error.length === 1) return ['1 validation error']
  return [`${error.length} validation errors`]
}

export async function writeOutput (output: string, relativeFilename: string, outputFolder: string): Promise<void> {
  const outputFileName = path.join(outputFolder, relativeFilename)
  const outputDir = path.dirname(outputFileName)
  await fs.promises.mkdir(outputDir, { recursive: true })
  await fs.promises.writeFile(outputFileName, output, 'utf8')
}

export function loadTemplate (path: string): HandlebarsTemplateDelegate {
  const templateString = fs.readFileSync(path).toString()
  return Handlebars.compile(templateString)
}
