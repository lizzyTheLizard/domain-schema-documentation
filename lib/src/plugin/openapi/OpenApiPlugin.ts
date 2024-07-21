import { type Plugin } from '../Plugin'
import { type Module, type Model } from '../../reader/Reader'
import { type ModuleWithOpenApi, OpenAPIGenerator, getFileName as getOpenApiSpecFileName } from './OpenApiGenerator'

export interface OpenApiPluginOptions {
  /**
   * The source OpenAPI-Specification to validate. If undefined, no validation will be done.
   * You can also provide a function that takes a module and returns the source directory if the source directory is different for each module.
   * Default is undefined.
   */
  srcSpec: string | ((module: Module) => string) | undefined
}

/**
 * A plugin that generates OpenAPI specifications and validate existing OpenAPI specifications.
 * TODO: Validate existing specs
 * TODO: Better integration tests?
 * TODO: Check full model
 * TODO: Update documentation
 * @param outputFolder The folder to write the output to. Should be the same as the output folder of the writer.
 * @param optionsOrUndefined The options for the plugin. If not provided, the default options will be used.
 * @returns The plugin
 */
export function openApiPlugin (outputFolder: string, optionsOrUndefined?: Partial<OpenApiPluginOptions>): Plugin {
  return async (model: Model) => {
    // TODO: Use options or remove it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const options = applyDefaults(optionsOrUndefined)
    const generator = new OpenAPIGenerator(model, outputFolder)
    await Promise.all(model.modules.map(async m => {
      if (!hasOperations(m)) return
      await generator.generate(m)
      m.links.push({ text: 'OpenApiSpec', href: `./${getOpenApiSpecFileName(m)}` })
    }))
  }
}

function applyDefaults (optionsOrUndefined?: Partial<OpenApiPluginOptions>): OpenApiPluginOptions {
  return {
    srcSpec: optionsOrUndefined?.srcSpec ?? undefined
  }
}

function hasOperations (module: Module): module is ModuleWithOpenApi {
  if (!('openApi' in module)) return false
  if (typeof module.openApi !== 'object') return false
  if (module.openApi === null) return false
  if (Object.keys(module.openApi).length === 0) return false
  return true
}
