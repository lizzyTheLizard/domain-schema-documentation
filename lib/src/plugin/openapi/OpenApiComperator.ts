import { promises as fs } from 'fs'
import { type ImplementationError, type Module } from '../../reader/Reader'
import { type OpenApiPluginOptions } from './OpenApiPlugin'
import { jsonSchemaDiff } from './JsonSchemaDiff'
import SwaggerParser from '@apidevtools/swagger-parser'
import { OpenAPIV3 } from 'openapi-types'

/**
 * Validates if the expected OpenAPI specification is equal to the implemented OpenAPI specification.
 * Errors will be added to the module.
 * @param module The current module
 * @param expectedSpec The expected OpenAPI specification
 * @param options The options for the OpenAPI plugin
 * @returns A promise that resolves when the validation is done
 */
export class OpenApiComperator {
  readonly #parser = new SwaggerParser()
  constructor (private readonly options: OpenApiPluginOptions) {
  }

  public async ensureEqual (module: Module, expectedSpecInput: OpenAPIV3.Document): Promise<void> {
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
    const implementedSpec = await this.#parser.dereference(srcFile, { dereference: { circular: 'ignore' } })
    // This will change the spec in place but we do not want to change the original spec. So let's clone it first
    const clone = structuredClone(expectedSpecInput)
    const expectedSpec = await this.#parser.dereference(clone, { dereference: { circular: 'ignore' } })
    const errors = this.compareSpec(expectedSpec as OpenAPIV3.Document, implementedSpec as OpenAPIV3.Document)
      .map(e => ({ ...e, text: `${e.text} in '${srcFile}'` }))
    module.errors.push(...errors)
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

  private compareSpec (expectedSpec: OpenAPIV3.Document, implementedSpec: OpenAPIV3.Document): ImplementationError[] {
    const result: ImplementationError[] = []
    const expectedPaths = Object.keys(expectedSpec.paths ?? {})
    const implementedPaths = Object.keys(implementedSpec.paths ?? {})

    expectedPaths.forEach(expectedPath => {
      const implementedPath = implementedPaths.find(implementedPath => this.pathEquals(expectedPath, implementedPath))
      if (implementedPath === undefined) {
        result.push({ text: `Path '${expectedPath}' must exist`, type: 'MISSING_IN_IMPLEMENTATION' })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result.push(...this.comparePath(expectedPath, expectedSpec.paths[expectedPath]!, implementedSpec.paths[implementedPath]!))
      }
    })

    implementedPaths.forEach(implementedPath => {
      if (expectedPaths.find(expectedPath => this.pathEquals(expectedPath, implementedPath)) === undefined) {
        result.push({ text: `Path '${implementedPath}' must not exist`, type: 'NOT_IN_DOMAIN_MODEL' })
      }
    })
    return result
  }

  private comparePath (path: string, expectedPath: OpenAPIV3.PathItemObject, implementedPath: OpenAPIV3.PathItemObject): ImplementationError[] {
    const result: ImplementationError[] = []

    for (const [,method] of Object.entries(OpenAPIV3.HttpMethods)) {
      const methodStr = `${method.toUpperCase()} ${path}`
      if (!(method in expectedPath) && !(method in implementedPath)) {
        continue
      }
      if (method in expectedPath && !(method in implementedPath)) {
        result.push({ text: `Method '${methodStr}' must exist`, type: 'MISSING_IN_IMPLEMENTATION' })
        continue
      }
      if (!(method in expectedPath) && method in implementedPath) {
        result.push({ text: `Method '${methodStr}' must not exist`, type: 'NOT_IN_DOMAIN_MODEL' })
        continue
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expectedMethod = expectedPath[method]!
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const implementedMethod = implementedPath[method]!
      result.push(...this.compareRequestBody(methodStr, expectedMethod, implementedMethod))
      result.push(...this.compareResponseBodies(methodStr, expectedMethod, implementedMethod))
    }
    return result
  }

  private compareRequestBody (method: string, expectedMethod: OpenAPIV3.OperationObject, implementedMethod: OpenAPIV3.OperationObject): ImplementationError[] {
    const expectedRequestBody = 'requestBody' in expectedMethod ? expectedMethod.requestBody : undefined
    const implementedRequestBody = 'requestBody' in implementedMethod ? implementedMethod.requestBody : undefined

    if (expectedRequestBody === undefined && implementedRequestBody === undefined) {
      return []
    }
    if (expectedRequestBody === undefined) {
      return [{ text: `Request must not exist in method '${method}'`, type: 'NOT_IN_DOMAIN_MODEL' }]
    }
    if (implementedRequestBody === undefined) {
      return [{ text: `Request must exist in method '${method}'`, type: 'MISSING_IN_IMPLEMENTATION' }]
    }
    const context = `Request body in method '${method}'`
    return this.compareContentObject(context, expectedRequestBody, implementedRequestBody)
  }

  private compareResponseBodies (method: string, expectedMethod: OpenAPIV3.OperationObject, implementedMethod: OpenAPIV3.OperationObject): ImplementationError[] {
    const result: ImplementationError[] = []
    const expectedResponseStatusCodes = Object.keys(expectedMethod.responses ?? {})
    const implementedResponseStatusCodes = Object.keys(implementedMethod.responses ?? {})

    expectedResponseStatusCodes.forEach(expectedStatusCode => {
      if (!implementedResponseStatusCodes.includes(expectedStatusCode)) {
        result.push({ text: `Response '${expectedStatusCode}' in method '${method}' must exist`, type: 'MISSING_IN_IMPLEMENTATION' })
        return
      }
      const expectedResponseBody = expectedMethod.responses[expectedStatusCode]
      const implementedResponseBody = implementedMethod.responses[expectedStatusCode]
      const context = `Response body '${expectedStatusCode}' in method '${method}'`
      result.push(...this.compareContentObject(context, expectedResponseBody, implementedResponseBody))
    })
    implementedResponseStatusCodes.forEach(implementedStatusCode => {
      if (!expectedResponseStatusCodes.includes(implementedStatusCode)) {
        result.push({ text: `Response '${implementedStatusCode}' in method '${method}' must not exist`, type: 'NOT_IN_DOMAIN_MODEL' })
      }
    })
    return result
  }

  private compareContentObject (context: string, expectedObject: ContentObject, implementedObject: ContentObject): ImplementationError[] {
    if (expectedObject.$ref !== undefined || implementedObject.$ref !== undefined) {
      throw Error('Do not expect $ref in content object as spec is already dereferenced')
    }

    const expectedContent = expectedObject.content
    const implementedContent = implementedObject.content
    if (expectedContent === undefined && implementedContent === undefined) {
      return []
    }
    if (expectedContent === undefined) {
      return [{ text: `${context} must exist`, type: 'MISSING_IN_IMPLEMENTATION' }]
    }
    if (implementedContent === undefined) {
      return [{ text: `${context} must not exist`, type: 'NOT_IN_DOMAIN_MODEL' }]
    }
    const expectedMediaTypes = Object.keys(expectedContent)
    const implementedMediaTypes = Object.keys(implementedContent)

    const result: ImplementationError[] = []
    expectedMediaTypes.forEach(expectedMediaType => {
      if (!implementedMediaTypes.includes(expectedMediaType)) {
        result.push({ text: `${context} must support media type '${expectedMediaType}'`, type: 'MISSING_IN_IMPLEMENTATION' })
      }
      const expectedSchema = expectedContent[expectedMediaType].schema
      const implementedSchema = implementedContent[expectedMediaType].schema
      const contextWithMT = expectedMediaTypes.length === 1 ? context : `${context} with media type '${expectedMediaType}'`
      result.push(...jsonSchemaDiff(expectedSchema, implementedSchema).map(e => ({ ...e, text: `${contextWithMT} is wrong: ${e.text}` })))
    })
    implementedMediaTypes.forEach(implementedMediaType => {
      if (!expectedMediaTypes.includes(implementedMediaType)) {
        result.push({ text: `${context} must not support media type '${implementedMediaType}'`, type: 'NOT_IN_DOMAIN_MODEL' })
      }
    })
    return result
  }

  private pathEquals (path1: string, path2: string): boolean {
    // Remove path parameters as they are not part of the path to compare
    const cleanedPath1 = path1.replaceAll(/\/\{[^}]*\}/g, '/{}')
    const cleanedPath2 = path1.replaceAll(/\/\{[^}]*\}/g, '/{}')
    return cleanedPath1 === cleanedPath2
  }
}

interface ContentObject {
  content?: Record<string, OpenAPIV3.MediaTypeObject>
  $ref?: string
}
