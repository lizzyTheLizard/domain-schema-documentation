import * as yaml from 'yaml'
import { promises as fs } from 'fs'
import { type ImplementationError, type Module } from '../../reader/Reader'
import { type OpenApiPluginOptions } from './OpenApiPlugin'
import { type DiffResultAction, type DiffResultEntity, diffSpecs } from 'openapi-diff'
import { compare, getValueByPointer } from 'fast-json-patch'
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

  if (expectedSpec === undefined && exists) {
    module.errors.push({
      text: `'${srcFile}' should not exist as ${module.$id} has no openapi specification`,
      type: 'NOT_IN_DOMAIN_MODEL'
    })
  } else if (expectedSpec !== undefined && !exists) {
    module.errors.push({
      text: `'${srcFile}' should exist as ${module.$id} has an openapi specification`,
      type: 'MISSING_IN_IMPLEMENTATION'
    })
  } else if (expectedSpec !== undefined && exists) {
    const contend = await fs.readFile(srcFile)
    const implementedSpec = yaml.parse(contend.toString())
    const specDifferences = await compareSpecs(expectedSpec, implementedSpec, srcFile, module)
    const errors = specDifferences.flatMap(d => convertToError(d)).map(e => ({ ...e, text: `${e.text} in '${srcFile}'` }))
    module.errors.push(...unique(errors))
  }
}

async function compareSpecs (expectedSpec: unknown, implementedSpec: unknown, srcFile: string, module: Module): Promise<SchemaDiff[]> {
  const result = await diffSpecs({
    sourceSpec: { content: JSON.stringify(expectedSpec), location: module.$id, format: 'openapi3' },
    destinationSpec: { content: JSON.stringify(implementedSpec), location: srcFile, format: 'openapi3' }
  })
  // merge all differences
  const allDifs = [
    ...result.nonBreakingDifferences,
    ...result.unclassifiedDifferences,
    ...(result.breakingDifferencesFound ? result.breakingDifferences : [])
  ]
  return allDifs.map(r => ({
    action: r.action,
    entity: r.entity,
    location: r.action === 'add' ? r.destinationSpecEntityDetails[0]?.location : r.sourceSpecEntityDetails[0]?.location,
    source: r.sourceSpecEntityDetails[0]?.value,
    target: r.destinationSpecEntityDetails[0]?.value
  }))
}

function convertToError (diff: SchemaDiff): ImplementationError[] {
  const l = diff.location.split('.')
  const type = diff.action === 'add' ? 'NOT_IN_DOMAIN_MODEL' : 'MISSING_IN_IMPLEMENTATION'
  const message = diff.action === 'add' ? 'must not exist' : 'must exist'
  switch (diff.entity) {
    case 'path':
      return [{ text: `Path '${l[1]}' ${message}`, type }]
    case 'method':
      return [{ text: `Method '${l[2].toUpperCase()} ${l[1]}' ${message}`, type }]
    case 'response.status-code':
      return [{ text: `Response '${l[4]}' on method '${l[2].toUpperCase()} ${l[1]}' ${message}`, type }]
    case 'request.body.scope':
      return objectDiff(diff.source, diff.target).map(e => ({ ...e, text: `${e.text} in request body on method '${l[2].toUpperCase()} ${l[1]}'` }))
    case 'response.body.scope':
      return objectDiff(diff.source, diff.target).map(e => ({ ...e, text: `${e.text} in response body '${l[4]}' on method '${l[2].toUpperCase()} ${l[1]}'` }))
    default:
      // We do not care about other differences
      return []
  }
}

function objectDiff (source: object, destination: object): ImplementationError[] {
  return compare(source, destination, false).map(ops => {
    switch (ops.op) {
      case 'copy':
        return { type: 'NOT_IN_DOMAIN_MODEL', text: `${ops.path} is a copy of '${ops.from}' and should not exist` }
      case 'add':
        return { type: 'NOT_IN_DOMAIN_MODEL', text: `${ops.path} should not exist` }
      case 'remove':
        return { type: 'MISSING_IN_IMPLEMENTATION', text: `${ops.path} is missing` }
      case 'replace':
        return { type: 'WRONG', text: `${ops.path} is '${getValueByPointer(destination, ops.path)}' instead of '${getValueByPointer(source, ops.path)}'` }
      case 'move':
        return { type: 'WRONG', text: `${ops.path} instead of '${ops.from}'` }
      default:
        throw new Error('Unknonwn Operation ' + ops.op + ' in ' + JSON.stringify(ops))
    }
  })
}

async function existAndAccessible (file: string): Promise<boolean> {
  const exists = await fs.stat(file).then(_ => true).catch(_ => false)
  if (!exists) return false
  return await fs.access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

function unique<T> (input: T[]): T[] {
  const stringArray = input.map(i => JSON.stringify(i))
  const uniqueStringArray = [...new Set(stringArray)]
  return uniqueStringArray.map(i => JSON.parse(i))
}

interface SchemaDiff {
  action: DiffResultAction
  entity: DiffResultEntity
  location: string
  source: object
  target: object
}
