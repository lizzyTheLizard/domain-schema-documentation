import { type Application, type Model, type Module, type Schema } from '../reader/Reader'
import { applicationDiagram, moduleDiagram, schemaDiagramm } from './MermaidDiagramGenerator'
import path from 'path'
import fs from 'fs'
import Handlebars from 'handlebars'
import { getModuleForSchema } from '../reader/helper/InputHelper'
import { type VerificationError } from './Writer'

export type EnhancedSchema = Schema & {
  hasDefinitions: boolean
  classDiagram: string
  errors: VerificationError[]
  module: Module
}

export function enhanceSchema (model: Model, schema: Schema, verificationErrors: VerificationError[]): EnhancedSchema {
  const errors = verificationErrors.filter(e => 'schema' in e && e.schema === schema)
  return {
    ...schema,
    hasDefinitions: Object.keys(schema.definitions).length !== 0,
    'x-links': schema['x-links'] ?? [],
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

export function enhanceModule (model: Model, module: Module, verificationErrors: VerificationError[]): EnhancedModule {
  const errors = verificationErrors.filter(e => 'module' in e && e.module === module)
  return {
    ...module,
    'x-links': module['x-links'] ?? [],
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

export function enhanceApplication (model: Model, verificationErrors: VerificationError[]): EnhancedApplication {
  const application = model.application
  const errors = verificationErrors.filter(e => 'application' in e && e.application === application)
  return {
    ...application,
    'x-links': application['x-links'] ?? [],
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
