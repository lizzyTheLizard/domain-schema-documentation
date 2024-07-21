import { writeOutput } from '../../writer/WriterHelpers'
import * as yaml from 'yaml'
import path, { extname } from 'path'
import type { Schema, Model, Module, Definition, Property } from '../../reader/Reader'
import { cleanName, getSchema } from '../../reader/helper/InputHelper'

/**
 * Generates OpenApi-Specifications from module files
 * Removes stuff that is not compatible with OpenAPI, collect other schemas into one file
 * and writes the resulting file to the output folder
 * TODO: Validate the generated spec
 */
export class OpenAPIGenerator {
  #currentModule!: ModuleWithOpenApi
  #currentSpec!: OpenApiSpec
  #schemasToProcess!: string[]
  #processedSchemas!: string[]

  constructor (private readonly model: Model, private readonly outputFolder: string) {}

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
      const schemaName = getSchemaName(s.$id)
      this.#currentSpec.components.schemas[schemaName] = schemaCopy
      Object.entries(s.definitions).forEach(([definitionName, originalDefinition]) => {
        const definitionCopy = cleanDefinitionCopy(originalDefinition)
        this.replaceRefs(definitionCopy, s.$id)
        const name = schemaName + definitionName
        this.#currentSpec.components.schemas[name] = definitionCopy
      })
    }
    await this.write()
    return this.#currentSpec
  }

  private createInitialOpenApiSpec (): OpenApiSpec {
    const openApiSpec: OpenApiSpec = {
      openapi: '3.0.3',
      info: {
        title: this.#currentModule.title,
        description: this.#currentModule.description,
        version: new Date().toDateString()
      },
      servers: [],
      components: { schemas: {}, securitySchemes: {} },
      paths: {},
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
      const schemaName = getSchemaName(schemaId)
      input.$ref = '#/components/schemas/' + schemaName
      return
    }
    if (input.$ref.startsWith('#/components/')) {
      return
    }
    if (input.$ref.startsWith('#/definitions/')) {
      if (schemaId === undefined) {
        throw new Error(`Unsupported reference ${input.$ref}. Cannot have '#/definitions' a reference in OpenApi. Do you mean '#/components?`)
      }
      const schemaName = getSchemaName(schemaId)
      input.$ref = '#/components/schemas/' + schemaName + input.$ref.substring(14)
      return
    }
    if (input.$ref.startsWith('#')) {
      throw new Error(`Unsupported reference ${input.$ref}. Not a definition or component but start with '#'`)
    }
    let id: string
    if (input.$ref.startsWith('.')) {
      id = path.join(this.#currentModule.$id, input.$ref)
    } else if (input.$ref.startsWith('/')) {
      id = input.$ref
    } else {
      throw new Error(`Unsupported reference ${input.$ref}. Is not a local reference (must start with '#'), not am absolute filename (must start with '/') or a relative filename (must start with '.')`)
    }
    if (!this.#processedSchemas.includes(id)) {
      this.#processedSchemas.push(id)
      this.#schemasToProcess.push(id)
    }
    const otherSchemaName = getSchemaName(id)
    input.$ref = '#/components/schemas/' + otherSchemaName
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
  return `${path.basename(module.$id).replace(path.extname(module.$id), '')}.openapi.yaml`
}

function getSchemaName (schemaId: string): string {
  const name = schemaId.substring(0, schemaId.length - extname(schemaId).length)
  return cleanName(name)
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
