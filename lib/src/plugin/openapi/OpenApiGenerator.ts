import type { Schema, Model, Module, Definition, Property } from '../../reader/Reader'
import { cleanName, getModuleId, getSchema, getSchemaName, resolveRelativeIdForModule } from '../../reader/helper/InputHelper'
import SwaggerParser from '@apidevtools/swagger-parser'
import { type OpenAPIV3 } from 'openapi-types'

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

  constructor (private readonly model: Model) {
  }

  public async generate (module: Module, inputSpec: object): Promise<OpenAPIV3.Document> {
    this.#module = module
    this.#schemasToProcess = []
    this.#processedSchemas = []
    const currentSpec = this.createInitialOpenApiSpec(inputSpec)
    this.replaceRefs(currentSpec)
    let currentSchemaId: string | undefined
    while ((currentSchemaId = this.#schemasToProcess.pop()) !== undefined) {
      const s = getSchema(this.model, currentSchemaId)
      const schemaCopy = OpenApiGenerator.cleanSchemaCopy(s)
      this.replaceRefs(schemaCopy, s.$id)
      currentSpec.components.schemas[OpenApiGenerator.getDefinitionName(s)] = schemaCopy
      Object.entries(s.definitions).forEach(([definitionName, originalDefinition]) => {
        const definitionCopy = OpenApiGenerator.cleanDefinitionCopy(originalDefinition)
        this.replaceRefs(definitionCopy, s.$id)
        currentSpec.components.schemas[OpenApiGenerator.getDefinitionName(s, definitionName)] = definitionCopy
      })
    }
    await this.validateGeneratedSpec(currentSpec)
    return currentSpec
  }

  private createInitialOpenApiSpec (inputSpec: object): OpenAPIV3.Document & { components: { schemas: object } } {
    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: this.#module.title,
        description: this.#module.description,
        version: new Date().toDateString()
      },
      servers: [],
      paths: {},
      components: { schemas: {}, securitySchemes: {} },
      ...structuredClone(inputSpec)
    }
    if (openApiSpec.components.schemas === undefined) { openApiSpec.components.schemas = {} }
    return openApiSpec
  }

  private replaceRefs (input: unknown, schemaId?: string): void {
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
      input.$ref = '#/components/schemas/' + OpenApiGenerator.getDefinitionName(schemaId)
      return
    }
    if (input.$ref.startsWith('#/components/')) {
      return
    }
    if (input.$ref.startsWith('#/definitions/')) {
      if (schemaId === undefined) {
        throw new Error(`Unsupported reference ${input.$ref}. Cannot have '#/definitions' a reference in OpenApi. Do you mean '#/components?`)
      }
      input.$ref = '#/components/schemas/' + OpenApiGenerator.getDefinitionName(schemaId, input.$ref.substring(14))
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
    input.$ref = '#/components/schemas/' + OpenApiGenerator.getDefinitionName(id)
  }

  private static getDefinitionName (schemaOrschemaId: string | Schema, definitionName?: string): string {
    const moduleId = cleanName(getModuleId(schemaOrschemaId))
    const schemaName = cleanName(getSchemaName(schemaOrschemaId))
    const result = moduleId + schemaName
    if (definitionName === undefined) {
      return result
    }
    return result + cleanName(definitionName)
  }

  private static cleanSchemaCopy (schema: Schema): OpenAPIV3.SchemaObject {
    const copyWithStuff = structuredClone(schema) as Partial<Schema>
    delete copyWithStuff.$id
    delete copyWithStuff.definitions
    delete copyWithStuff.examples
    delete copyWithStuff.title
    if ('required' in copyWithStuff && copyWithStuff.required?.length === 0) {
      delete copyWithStuff.required
    }
    const copy = copyWithStuff as OpenAPIV3.SchemaObject

    if (schema.examples !== undefined && schema.examples.length !== 0) {
      copy.example = schema.examples[0]
    }
    if ('properties' in schema && schema.properties !== undefined) {
      const properites: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {}
      Object.entries(schema.properties).forEach(([n, v]) => { properites[n] = OpenApiGenerator.cleanPropertyCopy(v) })
      copy.properties = properites
    }
    return copy
  }

  private static cleanDefinitionCopy (definition: Definition): OpenAPIV3.SchemaObject {
    const copy = structuredClone(definition) as OpenAPIV3.SchemaObject
    if ('properties' in definition && definition.properties !== undefined) {
      const properites: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {}
      Object.entries(definition.properties).forEach(([n, v]) => { properites[n] = OpenApiGenerator.cleanPropertyCopy(v) })
      copy.properties = properites
    }
    return copy
  }

  private static cleanPropertyCopy (property: Property): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    if (!('type' in property)) {
      return structuredClone(property)
    }
    if (property.type === 'array') {
      return {
        ...structuredClone(property),
        items: OpenApiGenerator.cleanPropertyCopy(property.items)
      }
    }
    if ('const' in property) {
      const copyWithStuff = structuredClone(property)
      delete copyWithStuff.const
      return {
        ...copyWithStuff,
        enum: [property.const]
      }
    }
    return structuredClone(property)
  }

  private async validateGeneratedSpec (spec: OpenAPIV3.Document): Promise<void> {
    const parserOptions: SwaggerParser.Options = { dereference: { circular: 'ignore' } }
    // This will change the spec in place but we do not want to change the original spec. So let's clone it first
    const clone = structuredClone(spec)
    await this.#parser.validate(clone, parserOptions)
  }
}
