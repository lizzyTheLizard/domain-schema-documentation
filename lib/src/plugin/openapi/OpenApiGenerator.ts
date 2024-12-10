import type { Schema, Model, Module } from '../../reader/Reader'
import { cleanName, getModuleId, getSchema, getSchemaName, resolveRelativeIdForModule } from '../../reader/InputHelper'
import SwaggerParser from '@apidevtools/swagger-parser'
import { type OpenAPIV3 } from 'openapi-types'
import { type Definition, type Property } from '../../schemaNormalizer/NormalizedSchema'
import { SchemaObject } from 'ajv'
import { OpenApiPluginOptions } from './OpenApiPlugin'

/**
 * Generates OpenApi-Specifications from module files
 * - Removes stuff that is not compatible with OpenAPI
 * - Collect other schemas into one file
 */
export class OpenApiGenerator {
  readonly #parser = new SwaggerParser()
  #schemasToProcess: string[] = []
  #processedSchemas: string[] = []
  #module!: Module

  constructor(private readonly model: Model, private readonly options: OpenApiPluginOptions) {
  }

  /**
   * Generates an OpenAPI specification from a module
   * @param module The module to generate the OpenAPI specification for
   * @param inputSpec The input specification
   * @returns An OpenAPI specification
   */
  public async generate(module: Module, inputSpec: object): Promise<OpenAPIV3.Document> {
    this.#module = module
    this.#schemasToProcess = []
    this.#processedSchemas = []
    const currentSpec = this.createInitialOpenApiSpec(inputSpec)
    this.replaceRefs(currentSpec)
    let currentSchemaId: string | undefined
    while ((currentSchemaId = this.#schemasToProcess.pop()) !== undefined) {
      const s = getSchema(this.model, currentSchemaId)
      const schemaCopy = this.cleanSchema(s)
      this.replaceRefs(schemaCopy, s.$id)
      currentSpec.components.schemas[this.getDefinitionName(s)] = schemaCopy
      Object.entries(s.definitions).forEach(([definitionName, originalDefinition]) => {
        const definitionCopy = this.cleanDefinition(originalDefinition)
        this.replaceRefs(definitionCopy, s.$id)
        currentSpec.components.schemas[this.getDefinitionName(s, definitionName)] = definitionCopy
      })
    }
    await this.validateGeneratedSpec(currentSpec)
    return currentSpec
  }

  private createInitialOpenApiSpec(inputSpec: object): OpenAPIV3.Document & { components: { schemas: object } } {
    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: this.#module.title,
        description: this.#module.description,
        version: new Date().toDateString(),
      },
      servers: [],
      paths: {},
      components: { schemas: {}, securitySchemes: {} },
      ...structuredClone(inputSpec),
    }
    return openApiSpec
  }

  private replaceRefs(input: unknown, schemaId?: string): void {
    if (input == null || typeof input !== 'object') return
    Object.entries(input).forEach(([_, value]) => {
      this.replaceRefs(value, schemaId)
    })
    if (!('$ref' in input)) {
      return
    }
    if (typeof input.$ref !== 'string') {
      throw new Error(`Unsupported reference ${JSON.stringify(input.$ref)}. Reference must be a string`)
    }
    if (input.$ref === '#') {
      if (schemaId === undefined) {
        throw new Error(`Unsupported reference ${input.$ref}. Cannot have '#' a reference in OpenApi. Do you mean '#/components?`)
      }
      input.$ref = '#/components/schemas/' + this.getDefinitionName(schemaId)
      return
    }
    if (input.$ref.startsWith('#/components/')) {
      return
    }
    if (input.$ref.startsWith('#/definitions/')) {
      if (schemaId === undefined) {
        throw new Error(`Unsupported reference ${input.$ref}. Cannot have '#/definitions' a reference in OpenApi. Do you mean '#/components?`)
      }
      input.$ref = '#/components/schemas/' + this.getDefinitionName(schemaId, input.$ref.substring(14))
      return
    }
    if (input.$ref.startsWith('#')) {
      throw new Error(`Unsupported reference ${input.$ref}. Not a definition or component but start with '#'`)
    }
    let id: string
    if (input.$ref.startsWith('.')) {
      id = resolveRelativeIdForModule(this.#module, input.$ref)
    } else if (input.$ref.startsWith('/')) {
      id = input.$ref
    } else {
      throw new Error(`Unsupported reference ${input.$ref}. Is not a local reference (must start with '#'), not am absolute filename (must start with '/') or a relative filename (must start with '.')`)
    }
    if (!this.#processedSchemas.includes(id)) {
      this.#processedSchemas.push(id)
      this.#schemasToProcess.push(id)
    }
    input.$ref = '#/components/schemas/' + this.getDefinitionName(id)
  }

  private getDefinitionName(schemaOrschemaId: string | Schema, definitionName?: string): string {
    const moduleId = cleanName(getModuleId(schemaOrschemaId))
    const schemaName = cleanName(getSchemaName(schemaOrschemaId))

    let result = schemaName
    if (this.options.prefixDefinitions) {
      result = moduleId + schemaName
    }
    if (definitionName === undefined) {
      return result
    }
    return result + cleanName(definitionName)
  }

  private cleanSchema(schema: Schema): OpenAPIV3.SchemaObject {
    const result: OpenAPIV3.SchemaObject = {
      ...this.cleanDefinition(schema),
      title: schema.title,
    }
    if (schema.examples !== undefined && schema.examples.length !== 0) {
      result.example = schema.examples[0]
    }
    return result
  }

  private cleanDefinition(definition: Definition): OpenAPIV3.SchemaObject {
    const result: OpenAPIV3.SchemaObject = {
      description: definition.description,
      type: definition.type,
    }
    if ('enum' in definition) {
      result.enum = definition.enum
    }
    if ('properties' in definition) {
      const properites: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {}
      Object.entries(definition.properties)
        .filter(([name]) => !this.options.ignoreProperties.includes(name))
        .forEach(([n, v]) => { properites[n] = this.cleanProperty(v) })
      result.properties = properites

      if (definition.required.length > 0) {
        result.required = definition.required
      }

      if (typeof definition.additionalProperties === 'boolean') {
        result.additionalProperties = definition.additionalProperties
      }
      if (typeof definition.additionalProperties === 'object') {
        result.additionalProperties = this.cleanProperty(definition.additionalProperties)
      }

      result.maxProperties = definition.maxProperties
      result.minProperties = definition.minProperties
    }
    if ('oneOf' in definition) {
      result.oneOf = definition.oneOf.map(s => this.cleanProperty(s))
    }
    if ('discriminator' in definition && definition.discriminator !== undefined) {
      result.discriminator = definition.discriminator as OpenAPIV3.DiscriminatorObject
    }
    this.copyExtensions(definition, result)
    return result
  }

  private cleanProperty(property: Property): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    if (!('type' in property)) {
      const resultRef = { $ref: property.$ref }
      this.copyExtensions(property, resultRef)
      return resultRef
    }
    let result: OpenAPIV3.SchemaObject
    switch (property.type) {
      case 'array':
        result = {
          type: property.type,
          items: this.cleanProperty(property.items),
          maxItems: property.maxItems,
          minItems: property.minItems,
          uniqueItems: property.uniqueItems,
        }
        break
      case 'object':
        result = { type: property.type }
        break
      case 'boolean':
        result = {
          type: property.type,
          format: property.format,
          default: property.default,
          readOnly: property.readOnly,
          writeOnly: property.writeOnly,
        }
        break
      case 'string':
        result = {
          type: property.type,
          format: property.format,
          default: property.default,
          maxLength: property.maxLength,
          minLength: property.minLength,
          pattern: property.pattern,
          readOnly: property.readOnly,
          writeOnly: property.writeOnly,
        }
        break
      case 'number':
      case 'integer':
        result = {
          type: property.type,
          format: property.format,
          default: property.default,
          multipleOf: property.multipleOf,
          maximum: property.maximum,
          minimum: property.minimum,
          readOnly: property.readOnly,
          writeOnly: property.writeOnly,
        }
        break
    }

    this.copyExtensions(property, result)

    if ('const' in property && property.const !== undefined) {
      result.enum = [property.const]
    }
    return result
  }

  private copyExtensions(source: object, target: SchemaObject): void {
    Object.entries(source).forEach(([key, value]) => {
      if (key.startsWith('x-')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        target[key] = value
      }
    })
  }

  private async validateGeneratedSpec(spec: OpenAPIV3.Document): Promise<void> {
    const parserOptions: SwaggerParser.Options = { dereference: { circular: 'ignore' } }
    // This will change the spec in place but we do not want to change the original spec. So let's clone it first
    const clone = structuredClone(spec)
    await this.#parser.validate(clone, parserOptions)
  }
}
