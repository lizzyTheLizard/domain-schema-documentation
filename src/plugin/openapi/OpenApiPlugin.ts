import path from 'path'
import { type Plugin, type VerificationError } from '../Plugin.ts'
import { type Module, type Model } from '../../reader/Reader.ts'
import { loadTemplate, writeOutput } from '../../writer/WriterHelpers.ts'

const template = loadTemplate('src/plugin/openapi/spec.hbs')

export function openApiPlugin (outputFolder: string): Plugin {
  return {
    validate: async () => await validateOpenApiSpec(),
    generateOutput: async (model) => { await generateOpenApiOutput(model, outputFolder) },
    getModuleLinks: (module) => [{ text: 'OpenApiSpec', href: './' + getFileName(module) }]
  }
}

async function validateOpenApiSpec (): Promise<VerificationError[]> {
  return []
}

async function generateOpenApiOutput (model: Model, outputFolder: string): Promise<void> {
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
