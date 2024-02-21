import { type Input, type Module } from '../../reader/Reader.ts'
import path from 'path'
import { type Plugin } from '../Plugin.ts'
import { loadTemplate, writeOutput } from '../../writer/Writer.ts'

const template = loadTemplate('src/plugin/openapi/spec.hbs')

export const openApiWriter: Plugin = {
  validateInput: () => {},
  validate: async () => [],
  generateOutput: generateOpenApiOutput,
  getApplicationLinks: () => [],
  getModuleLinks: (module) => [{ text: 'OpenApiSpec', href: getFileName(module) }],
  getSchemaLink: () => []
}

export async function generateOpenApiOutput (outputFolder: string, input: Input): Promise<void> {
  for (const module of input.modules) {
    // TODO: Implement template and test
    const relativeFilename = path.join(module.$id, getFileName(module))
    const output = template(module)
    await writeOutput(output, relativeFilename, outputFolder)
  }
}

function getFileName (module: Module): string {
  return `${path.basename(module.$id).replace(path.extname(module.$id), '')}.openapi.yaml`
}
