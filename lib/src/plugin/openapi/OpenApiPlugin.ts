import { type Plugin } from '../Plugin'
import { type Module, type Model } from '../../reader/Reader'
import { OpenApiGenerator } from './OpenApiGenerator'
import { OpenApiValidator } from './OpenApiValidator'
import { OpenApiComperator } from './OpenApiComperator'
import { writeOutput } from '../../writer/WriterHelpers'
import * as yaml from 'yaml'
import path from 'path'
import { getModuleName } from '../../reader/helper/InputHelper'

export interface OpenApiPluginOptions {
  /**
   * The source OpenAPI-Specification to validate. If undefined, no validation will be done.
   * You can also provide a function that takes a module and returns the source directory if the source directory is different for each module.
   * Default is undefined.
   */
  srcSpec: string | ((module: Module) => string | undefined) | undefined
}

/**
 * A plugin that generates OpenAPI specifications and validate existing OpenAPI specifications.
 * TODO: Update documentation
 * TODO: Run test for real model
 * TODO: Better integration into html link?
 * @param outputFolder The folder to write the output to. Should be the same as the output folder of the writer.
 * @param optionsOrUndefined The options for the plugin. If not provided, the default options will be used.
 * @returns The plugin
 */
export function openApiPlugin (outputFolder: string, optionsOrUndefined?: Partial<OpenApiPluginOptions>): Plugin {
  return async (model: Model) => {
    const options = applyDefaults(optionsOrUndefined)
    const validator = new OpenApiValidator()
    const generator = new OpenApiGenerator(model)
    const comperator = new OpenApiComperator(options)
    for (const module of model.modules) {
      const inputSpec = 'openApi' in module ? module.openApi : undefined
      if (inputSpec === undefined) {
        await comperator.ensureNoSpec(module)
        continue
      }
      if (typeof inputSpec !== 'object') {
        throw new Error(`The OpenAPI-Specification must be an object but is ${typeof openApiPlugin} in module ${module.$id}`)
      }
      if (inputSpec === null) {
        throw new Error(`The OpenAPI-Specification must be an object but is null in module ${module.$id}`)
      }
      const spec = generator.generate(module, inputSpec)
      validator.validate(module.$id, spec)
      await comperator.ensureEqual(module, spec)
      const yamlOutput = yaml.stringify(spec)
      const relativeFilename = path.join(module.$id, getFileName(module))
      await writeOutput(yamlOutput, relativeFilename, outputFolder)
      module.links.push({ text: 'OpenApiSpec', link: `./${getFileName(module)}` })
    }
  }
}

function getFileName (module: Module): string {
  return `${getModuleName(module)}.openapi.yaml`
}

function applyDefaults (optionsOrUndefined?: Partial<OpenApiPluginOptions>): OpenApiPluginOptions {
  return {
    srcSpec: optionsOrUndefined?.srcSpec ?? undefined
  }
}
