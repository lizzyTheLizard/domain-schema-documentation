import { type ImplementationError, type Application, type Model, type Module, type Schema } from '../reader/Reader'
import { applicationDiagram, moduleDiagram, schemaDiagramm } from './MermaidDiagramGenerator'
import path from 'path'
import fs from 'fs'
import Handlebars from 'handlebars'
import { getModuleForSchema, getSchemasForModule } from '../reader/helper/InputHelper'

// TODO: Document

export type EnhancedSchema = Schema & {
  hasDefinitions: boolean
  classDiagram: string
  module: Module
}

export function enhanceSchema (model: Model, schema: Schema): EnhancedSchema {
  return {
    ...schema,
    hasDefinitions: Object.keys(schema.definitions).length !== 0,
    'x-links': schema['x-links'] ?? [],
    'x-todos': [...schema['x-todos'] ?? [], ...getErrorTodos(schema['x-errors'])],
    classDiagram: schemaDiagramm(model, schema),
    module: getModuleForSchema(model, schema)
  }
}

export type EnhancedModule = Module & {
  classDiagram: string
  schemas: Schema[]
}

export function enhanceModule (model: Model, module: Module): EnhancedModule {
  return {
    ...module,
    links: module.links ?? [],
    todos: [...module.todos ?? [], ...getErrorTodos(module.errors)],
    classDiagram: moduleDiagram(model, module),
    schemas: getSchemasForModule(model, module)
  }
}

export type EnhancedApplication = Application & {
  classDiagram: string
  modules: Module[]
}

export function enhanceApplication (model: Model): EnhancedApplication {
  const application = model.application
  return {
    ...application,
    links: application.links ?? [],
    todos: [...application.todos ?? [], ...getErrorTodos(application.errors)],
    classDiagram: applicationDiagram(model),
    modules: model.modules
  }
}

function getErrorTodos (error: ImplementationError[] | undefined): string[] {
  if (error === undefined) return []
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

export function loadTemplate (path: string): Handlebars.TemplateDelegate {
  const templateString = fs.readFileSync(path).toString()
  return Handlebars.compile(templateString)
}
