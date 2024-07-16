import { type Tag, type Application, type Model, type Module, type Schema } from '../reader/Reader'
import { applicationDiagram, moduleDiagram, schemaDiagramm } from './MermaidDiagramGenerator'
import path from 'path'
import fs from 'fs'
import Handlebars from 'handlebars'
import { getModuleForSchema, getSchemasForModule } from '../reader/helper/InputHelper'

export type EnhancedSchema = Schema & {
  classDiagram: string
  module: Module
}

/**
 * Enhance a schema with additional information to be used in templates
 * @param model The model the schema belongs to
 * @param schema The schema to enhance
 * @returns The enhanced schema
 */
export function enhanceSchema (model: Model, schema: Schema): EnhancedSchema {
  return {
    ...schema,
    classDiagram: schemaDiagramm(model, schema),
    module: getModuleForSchema(model, schema)
  }
}

export type EnhancedModule = Module & {
  classDiagram: string
  schemas: Schema[]
}

/**
 * Enhance a module with additional information to be used in templates
 * @param model The model the module belongs to
 * @param module The module to enhance
 * @returns The enhanced module
 */
export function enhanceModule (model: Model, module: Module): EnhancedModule {
  return {
    ...module,
    classDiagram: moduleDiagram(model, module),
    schemas: getSchemasForModule(model, module)
  }
}

export type EnhancedApplication = Application & {
  classDiagram: string
  modules: Module[]
}

/**
 * Enhance an application with additional information to be used in templates
 * @param model The model the application belongs to
 * @returns The enhanced application
 */
export function enhanceApplication (model: Model): EnhancedApplication {
  const application = model.application
  return {
    ...application,
    classDiagram: applicationDiagram(model),
    modules: model.modules
  }
}

/**
 * Write the output to a file
 * @param output The output to write
 * @param relativeFilename The filename to write to, relative to the output folder
 * @param outputFolder The output folder to write to
 */
export async function writeOutput (output: string, relativeFilename: string, outputFolder: string): Promise<void> {
  const outputFileName = path.join(outputFolder, relativeFilename)
  const outputDir = path.dirname(outputFileName)
  await fs.promises.mkdir(outputDir, { recursive: true })
  await fs.promises.writeFile(outputFileName, output, 'utf8')
}

/**
 * Load a {@link Handlebars.TemplateDelegate} from a file
 * @param path The path to the template file
 * @returns The loaded template
 */
export function loadTemplate (path: string): Handlebars.TemplateDelegate {
  const templateString = fs.readFileSync(path).toString()
  return Handlebars.compile(templateString)
}

/**
 * Generate the {@link https://shields.io shields.io} url for a tag
 * @param tag The tag to generate the url for
 * @returns The url
 * @see https://shields.io/badges
 */
export function shieldIoBadgeUrl (tag: Tag): string {
  const name = encodeURIComponent(tag.name.replace('-', '--'))
  const value = tag.value !== undefined ? '-' + encodeURIComponent(tag.value.replace('-', '--')) : ''
  const color = '-' + encodeURIComponent(tag.color.replace('-', '--'))
  return `https://img.shields.io/badge/${name}${value}${color}`
}
