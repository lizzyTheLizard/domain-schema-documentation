import path from 'path'
import { type Plugin } from '../Plugin.ts'
import { type Module, type Model } from '../../reader/Reader.ts'
import { loadTemplate, writeOutput } from '../../writer/WriterHelpers.ts'

const template = loadTemplate('src/plugin/openapi/spec.hbs')

export const openApiWriter: Plugin = {
  generateOutput: generateOpenApiOutput,
  getModuleLinks: (module) => [{ text: 'OpenApiSpec', href: './' + getFileName(module) }]
}

export async function generateOpenApiOutput (outputFolder: string, model: Model): Promise<void> {
  for (const module of model.modules) {
    // TODO: Implement template and test
    const relativeFilename = path.join(module.$id, getFileName(module))
    const output = template(module)
    await writeOutput(output, relativeFilename, outputFolder)
  }
}

function getFileName (module: Module): string {
  return `${path.basename(module.$id).replace(path.extname(module.$id), '')}.openapi.yaml`
}
