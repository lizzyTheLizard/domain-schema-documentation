import { type SchemaObject } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { writeOutput } from '../../writer/WriterHelpers'
import * as yaml from 'yaml'
import path from 'path'
import type { Schema, Model, Module, Definition, Property } from '../../reader/Reader'
import { cleanName, getModuleId, getModuleName, getSchema, getSchemaName, resolveRelativeIdForModule } from '../../reader/helper/InputHelper'
import fs from 'fs'
import betterAjvErrors from 'better-ajv-errors'

/**
 * Generates OpenApi-Specifications from module files
 * Removes stuff that is not compatible with OpenAPI, collect other schemas into one file
 * and writes the resulting file to the output folder
 */
export class OpenAPIGenerator {
  readonly #ajv: Ajv2020
  readonly #openApiSchema: SchemaObject
  #currentModule!: ModuleWithOpenApi
  #currentSpec!: OpenApiSpec
  #schemasToProcess!: string[]
  #processedSchemas!: string[]

  constructor (private readonly model: Model, private readonly outputFolder: string) {
    this.#ajv = new Ajv2020({ allErrors: true, strict: false })
    addFormats(this.#ajv)
    this.#ajv.addFormat('media-range', true)
    const schemaFile = path.join(__dirname, 'openapi_31.json')
    this.#openApiSchema = JSON.parse(fs.readFileSync(schemaFile).toString())
  }

  public async generate (module: ModuleWithOpenApi): Promise<unknown> {
    this.#currentModule = module
    this.#schemasToProcess = []
    this.#processedSchemas = []
    this.#currentSpec = this.createInitialOpenApiSpec()
    this.replaceRefs(this.#currentSpec)
    let currentSchemaId: string | undefined
    while ((currentSchemaId = this.#schemasToProcess.pop()) !== undefined) {
      const s = getSchema(this.model, currentSchemaId)
      const schemaCopy = cleanSchemaCopy(s)
      this.replaceRefs(schemaCopy, s.$id)
      this.#currentSpec.components.schemas[getDefinitionName(s)] = schemaCopy
      Object.entries(s.definitions).forEach(([definitionName, originalDefinition]) => {
        const definitionCopy = cleanDefinitionCopy(originalDefinition)
        this.replaceRefs(definitionCopy, s.$id)
        this.#currentSpec.components.schemas[getDefinitionName(s, definitionName)] = definitionCopy
      })
    }
    await this.validate()
    await this.write()
    return this.#currentSpec
  }

  private createInitialOpenApiSpec (): OpenApiSpec {
    const openApiSpec: OpenApiSpec = {
      openapi: '3.1.0',
      info: {
        title: this.#currentModule.title,
        description: this.#currentModule.description,
        version: new Date().toDateString()
      },
      servers: [],
      paths: {},
      components: { schemas: {}, securitySchemes: {} },
      ...structuredClone(this.#currentModule.openApi)
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
      input.$ref = '#/components/schemas/' + getDefinitionName(schemaId)
      return
    }
    if (input.$ref.startsWith('#/components/')) {
      return
    }
    if (input.$ref.startsWith('#/definitions/')) {
      if (schemaId === undefined) {
        throw new Error(`Unsupported reference ${input.$ref}. Cannot have '#/definitions' a reference in OpenApi. Do you mean '#/components?`)
      }
      input.$ref = '#/components/schemas/' + getDefinitionName(schemaId, input.$ref.substring(14))
      return
    }
    if (input.$ref.startsWith('#')) {
      throw new Error(`Unsupported reference ${input.$ref}. Not a definition or component but start with '#'`)
    }
    let id: string
    if (input.$ref.startsWith('.')) {
      id = resolveRelativeIdForModule(this.#currentModule, input.$ref)
    } else if (input.$ref.startsWith('/')) {
      id = input.$ref
    } else {
      throw new Error(`Unsupported reference ${input.$ref}. Is not a local reference (must start with '#'), not am absolute filename (must start with '/') or a relative filename (must start with '.')`)
    }
    if (!this.#processedSchemas.includes(id)) {
      this.#processedSchemas.push(id)
      this.#schemasToProcess.push(id)
    }
    input.$ref = '#/components/schemas/' + getDefinitionName(id)
  }

  private async validate (): Promise<void> {
    if (!this.#currentSpec.openapi.startsWith('3.1')) { throw new Error('Only OpenAPI 3.1.X is supported') }
    try {
      if (this.#ajv.validate(this.#openApiSchema, this.#currentSpec)) return
    } catch (e: unknown) {
      const error = e as Error
      throw new Error(`Invalid OpenAPI-Spec in module ${this.#currentModule.$id}: ${error.message}`)
    }
    const errors = this.#ajv.errors
    if (!errors) {
      throw new Error(`Invalid OpenAPI-Spec in module ${this.#currentModule.$id}: ${this.#ajv.errorsText()}`)
    }
    console.error(betterAjvErrors(this.#openApiSchema, this.#currentSpec, errors, { json: JSON.stringify(this.#currentSpec, null, ' ') }))
    throw new Error(`Invalid OpenAPI-Spec in module ${this.#currentModule.$id}. See logs for details`)
  }

  private async write (): Promise<void> {
    const yamlOutput = yaml.stringify(this.#currentSpec)
    const relativeFilename = path.join(this.#currentModule.$id, getFileName(this.#currentModule))
    await writeOutput(yamlOutput, relativeFilename, this.outputFolder)
  }
}

/**
 * The filename of the generated OpenApi-Spec without path
 * @param module The module
 * @returns The filename
 */
export function getFileName (module: Module): string {
  return `${getModuleName(module)}.openapi.yaml`
}

function getDefinitionName (schemaOrschemaId: string | Schema, definitionName?: string): string {
  const moduleId = cleanName(getModuleId(schemaOrschemaId))
  const schemaName = cleanName(getSchemaName(schemaOrschemaId))
  const result = moduleId + schemaName
  if (definitionName === undefined) {
    return result
  }
  return result + cleanName(definitionName)
}

function cleanSchemaCopy (schema: Schema): unknown {
  const copy: Partial<Schema & { example: unknown, properties: Record<string, unknown> }> = structuredClone(schema)
  delete copy.$id
  delete copy.definitions
  delete copy.examples
  delete copy.title
  if (schema.examples !== undefined && schema.examples.length !== 0) {
    copy.example = schema.examples[0]
  }
  if ('required' in copy && copy.required?.length === 0) {
    delete copy.required
  }
  if ('properties' in schema && schema.properties !== undefined) {
    const properites: Record<string, unknown> = {}
    Object.entries(schema.properties).forEach(([n, v]) => { properites[n] = cleanPropertyCopy(v) })
    copy.properties = properites
  }
  return copy
}

function cleanDefinitionCopy (definition: Definition): unknown {
  const copy: Partial<Definition & { properties: Record<string, unknown> }> = structuredClone(definition)
  if ('properties' in definition && definition.properties !== undefined) {
    const properites: Record<string, unknown> = {}
    Object.entries(definition.properties).forEach(([n, v]) => { properites[n] = cleanPropertyCopy(v) })
    copy.properties = properites
  }
  return copy
}

function cleanPropertyCopy (property: Property): unknown {
  const copy: Partial<Property & { enum: unknown[], items: unknown }> = structuredClone(property)
  if ('const' in copy) {
    copy.enum = [copy.const]
    delete copy.const
  }
  if ('items' in property) {
    copy.items = cleanPropertyCopy(property.items)
  }
  return copy
}

export interface ModuleWithOpenApi extends Module {
  openApi: object
}

interface OpenApiSpec {
  openapi: string
  info: object
  servers: Array<{ url: string }>
  paths: object
  components: { schemas: Record<string, unknown>, securitySchemes: Record<string, undefined> }
}
