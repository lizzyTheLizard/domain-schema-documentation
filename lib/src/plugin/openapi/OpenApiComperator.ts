import * as yaml from 'yaml'
import { promises as fs } from 'fs'
import { type ImplementationError, type Module } from '../../reader/Reader'
import { type OpenApiPluginOptions } from './OpenApiPlugin'
import { diffSpecs, type DiffResult } from 'openapi-diff'
import { type Schema, jsonSchemaDiff } from './JsonSchemaDiff'

/**
 * Validates if the expected OpenAPI specification is equal to the implemented OpenAPI specification.
 * Errors will be added to the module.
 * TODO: Support enums values as those are not detected as changes in openapi-diff
 * TODO: Do not use this library any more as it does not recognize all differences
 * @param module The current module
 * @param expectedSpec The expected OpenAPI specification
 * @param options The options for the OpenAPI plugin
 * @returns A promise that resolves when the validation is done
 */
export class OpenApiComperator {
  constructor (private readonly options: OpenApiPluginOptions) {
  }

  public async ensureEqual (module: Module, expectedSpec: unknown): Promise<void> {
    const srcFile = this.getImplementedSpec(module)
    if (srcFile === undefined) return
    const exists = await this.existAndAccessible(srcFile)
    if (!exists) {
      module.errors.push({
        text: `'${srcFile}' should exist as module has an openapi specification`,
        type: 'MISSING_IN_IMPLEMENTATION'
      })
      return
    }

    const contend = await fs.readFile(srcFile)
    const implementedSpec = yaml.parse(contend.toString())
    const specDifferences = await diffSpecs({
      sourceSpec: { content: JSON.stringify(expectedSpec), location: 'generated', format: 'openapi3' },
      destinationSpec: { content: JSON.stringify(implementedSpec), location: srcFile, format: 'openapi3' }
    })
    const errors: ImplementationError[] = []
    errors.push(...specDifferences.nonBreakingDifferences.flatMap(d => this.convertToError(d)))
    errors.push(...specDifferences.unclassifiedDifferences.flatMap(d => this.convertToError(d)))
    if (specDifferences.breakingDifferencesFound) {
      errors.push(...specDifferences.breakingDifferences.flatMap(d => this.convertToError(d)))
    }
    const uniqueErrors = this.unique(errors)
    const errorsWithSrc = uniqueErrors.map(e => ({ ...e, text: `${e.text} in '${srcFile}'` }))
    module.errors.push(...errorsWithSrc)
  }

  public async ensureNoSpec (module: Module): Promise<void> {
    const srcFile = this.getImplementedSpec(module)
    if (srcFile === undefined) return
    const exists = await this.existAndAccessible(srcFile)
    if (!exists) return
    if (exists) {
      module.errors.push({
        text: `'${srcFile}' should not exist as module has no openapi specification`,
        type: 'NOT_IN_DOMAIN_MODEL'
      })
    }
  }

  private getImplementedSpec (module: Module): string | undefined {
    if (this.options.srcSpec === undefined) return
    return typeof this.options.srcSpec === 'string' ? this.options.srcSpec : this.options.srcSpec(module)
  }

  private async existAndAccessible (file: string): Promise<boolean> {
    const exists = await fs.stat(file).then(_ => true).catch(_ => false)
    if (!exists) return false
    return await fs.access(file, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false)
  }

  private convertToError (diff: DiffResult<any>): ImplementationError[] {
    const location = diff.action === 'add' ? diff.destinationSpecEntityDetails[0]?.location : diff.sourceSpecEntityDetails[0]?.location
    const source = diff.sourceSpecEntityDetails[0]?.value as Schema
    const target = diff.destinationSpecEntityDetails[0]?.value as Schema
    const l = location.split('.')
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
        return jsonSchemaDiff(source, target).map(e => ({ ...e, text: `${e.text} in request body on method '${l[2].toUpperCase()} ${l[1]}'` }))
      case 'response.body.scope':
        return jsonSchemaDiff(source, target).map(e => ({ ...e, text: `${e.text} in response body '${l[4]}' on method '${l[2].toUpperCase()} ${l[1]}'` }))
      default:
        // We do not care about other differences
        return []
    }
  }

  private unique<T> (input: T[]): T[] {
    const stringArray = input.map(i => JSON.stringify(i))
    const uniqueStringArray = [...new Set(stringArray)]
    return uniqueStringArray.map(i => JSON.parse(i))
  }
}
