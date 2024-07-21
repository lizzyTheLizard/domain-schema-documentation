import * as yaml from 'yaml'
import { promises as fs } from 'fs'
import { type ImplementationError, type Module } from '../../reader/Reader'
import { type OpenApiPluginOptions } from './OpenApiPlugin'
import { diffSpecs, type DiffResult } from 'openapi-diff'
/**
 * Validates if the expected OpenAPI specification is equal to the implemented OpenAPI specification.
 * Errors will be added to the module.
 * @param module The current module
 * @param expectedSpec The expected OpenAPI specification
 * @param options The options for the OpenAPI plugin
 * @returns A promise that resolves when the validation is done
 */
export async function validate (module: Module, expectedSpec: unknown | undefined, options: OpenApiPluginOptions): Promise<void> {
  if (options.srcSpec === undefined) return
  const srcFile = typeof options.srcSpec === 'string' ? options.srcSpec : options.srcSpec(module)
  if (srcFile === undefined) return
  const exists = await existAndAccessible(srcFile)
  if (expectedSpec === undefined) {
    if (exists) {
      module.errors.push({
        text: `'${srcFile}' should not exist but is present in the implementation`,
        type: 'NOT_IN_DOMAIN_MODEL'
      })
    }
    return
  }
  if (!exists) {
    module.errors.push({
      text: `'${srcFile}' should exist but is missing in the implementation`,
      type: 'MISSING_IN_IMPLEMENTATION'
    })
    return
  }
  const contend = await fs.readFile(srcFile)
  const implementedSpec = yaml.parse(contend.toString())
  const result = await diffSpecs({
    sourceSpec: { content: JSON.stringify(expectedSpec), location: module.$id, format: 'openapi3' },
    destinationSpec: { content: JSON.stringify(implementedSpec), location: srcFile, format: 'openapi3' }
  })
  // merge all differences
  const differences: Array<DiffResult< 'breaking' | 'unclassified' | 'non-breaking'>> = [...result.nonBreakingDifferences, ...result.unclassifiedDifferences]
  if (result.breakingDifferencesFound) {
    differences.push(...result.breakingDifferences)
  }
  for (const diff of differences) {
    module.errors.push(...convertToError(diff, srcFile))
  }
}

function convertToError (diff: DiffResult< 'breaking' | 'unclassified' | 'non-breaking'>, srcFile: string): ImplementationError[] {
  const location = diff.action === 'add' ? diff.destinationSpecEntityDetails[0].location : diff.sourceSpecEntityDetails[0].location
  const l = location.split('.')
  const type = diff.action === 'add' ? 'NOT_IN_DOMAIN_MODEL' : 'MISSING_IN_IMPLEMENTATION'
  const message = diff.action === 'add' ? `should not exist in '${srcFile}' but is present` : `should exist in '${srcFile}' but is missing`
  switch (diff.entity) {
    case 'path':
      return [{ text: `Path '${l[1]}' ${message}`, type }]
    case 'method':
      return [{ text: `Method '${l[2].toUpperCase()} ${l[1]}' ${message}`, type }]
    case 'request.body.scope':
      // This is wrong schema, report this only once as 'WRONG'
      if (diff.action === 'add') return []
      // TODO: Better schema diff
      return [{ text: `Request on method '${l[2].toUpperCase()} ${l[1]}' differs in schema. Should be '${JSON.stringify(diff.sourceSpecEntityDetails[0].value)}' but is '${JSON.stringify(diff.destinationSpecEntityDetails[0].value)}'`, type: 'WRONG' }]
    case 'response.status-code':
      return [{ text: `Response '${l[4]}' on method '${l[2].toUpperCase()} ${l[1]}' ${message}`, type }]
    case 'response.body.scope':
      // This is wrong schema, report this only once as 'WRONG'
      if (diff.action === 'add') return []
      // TODO: Better schema diff
      return [{ text: `Response '${l[4]}' on method '${l[2].toUpperCase()} ${l[1]}' differs in schema. Should be '${JSON.stringify(diff.sourceSpecEntityDetails[0].value)}' but is '${JSON.stringify(diff.destinationSpecEntityDetails[0].value)}'`, type: 'WRONG' }]
    default:
      return []
  }
}

async function existAndAccessible (file: string): Promise<boolean> {
  const exists = await fs.stat(file).then(_ => true).catch(_ => false)
  if (!exists) return false
  return await fs.access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}
