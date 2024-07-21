import { type Plugin } from '../Plugin'
import { type Module, type Model } from '../../reader/Reader'
import { OpenAPIGenerator, getFileName as getOpenApiSpecFileName } from './OpenApiGenerator'
import { validate } from './OpenApiValiator'

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
    const generator = new OpenAPIGenerator(model, outputFolder)
    for (const module of model.modules) {
      const specDef = await generator.generate(module)
      if (specDef !== undefined) module.links.push({ text: 'OpenApiSpec', href: `./${getOpenApiSpecFileName(module)}` })
      await validate(module, specDef, options)
    }
  }
}

function applyDefaults (optionsOrUndefined?: Partial<OpenApiPluginOptions>): OpenApiPluginOptions {
  return {
    srcSpec: optionsOrUndefined?.srcSpec ?? undefined
  }
}
