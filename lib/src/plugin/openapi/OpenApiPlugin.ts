import path from 'path'
import { type Plugin } from '../Plugin'
import { type Module, type Model } from '../../reader/Model'
import { writeOutput } from '../../writer/WriterHelpers'
import { type VerificationError } from '../../writer/Writer'
import * as yaml from 'yaml'

export interface OpenApiPluginOptions {
  servers?: string[]
  securitySchemes: Record<string, any>
}

export function openApiPlugin (outputFolder: string, options?: OpenApiPluginOptions): Plugin {
  return {
    updateModel: async (model) => addLinks(model),
    validate: async () => await validateOpenApiSpec(),
    generateOutput: async (model) => { await generateOpenApiSpecs(model, outputFolder, options) }
  }
}

function addLinks (model: Model): Model {
  return {
    application: model.application,
    modules: model.modules.map(m => ({ ...m, links: [...m.links ?? [], { text: 'OpenApiSpec', href: `./${getFileName(m)}` }] })),
    schemas: model.schemas
  }
}

function getFileName (module: Module): string {
  return `${path.basename(module.$id).replace(path.extname(module.$id), '')}.openapi.yaml`
}

async function validateOpenApiSpec (): Promise<VerificationError[]> {
  // TODO: Implement validation
  return []
}

async function generateOpenApiSpecs (model: Model, outputFolder: string, options?: OpenApiPluginOptions): Promise<void> {
  await Promise.all(model.modules.map(async module => {
    // TODO: If no operations, skip
    const relativeFilename = path.join(module.$id, getFileName(module))
    const output = generateOpenApiSpec(model, module, options)
    const yamlOutput = yaml.stringify(output)
    await writeOutput(yamlOutput, relativeFilename, outputFolder)
  }))
}

function generateOpenApiSpec (model: Model, module: Module, options?: OpenApiPluginOptions): Record<any, any> {
  return {
    openapi: '3.0.3',
    info: {
      title: module.title,
      description: module.description
    },
    servers: options?.servers?.map(server => ({ url: server })) ?? [],
    // TODO: Use operations from the input?
    paths: {},
    components: {
      // TODO: Get all relevant schemas
      schemas: {},
      securitySchemes: options?.securitySchemes ?? {}
    }
  }
}
