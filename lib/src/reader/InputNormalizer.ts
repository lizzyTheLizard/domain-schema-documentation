import Ajv, { type Format, type Options, type AnySchema } from 'ajv'
import {
  type Application,
  type ArrayProperty,
  type BasicProperty,
  type Definition,
  type EnumDefinition,
  type InterfaceDefinition,
  type Module,
  type ObjectDefinition,
  type RefProperty,
  type Property,
  type Schema,
  type SchemaType,
  type Model,
  type Link,
  type ImplementationError
} from './Reader'
import * as fs from 'fs'
import * as yaml from 'yaml'
import { cleanName, resolveRelativeId } from './helper/InputHelper'
import path from 'path'
import { type FormatName, fullFormats } from 'ajv-formats/dist/formats'

/**
 * Options for the InputNormalizer
 */
export interface InputNormalizerOptions {
  /**
   * AjvOptions given to the {@link InputNormalizer}. By default {allErrors: true, discriminator: true}
   * @see {@link https://ajv.js.org/options.html}
   */
  ajvOptions: Options
  /** Allow additional non documented properties in the examples, By default false   */
  noAdditionalPropertiesInExamples: boolean
  /**
   * Allowed formats. By default the formats of ajv-formats
   * @see {@link https://ajv.js.org/packages/ajv-formats.html}
   */
  allowedFormats: Array<{ name: string, avjFormat: Format }>
  /** Allowed additional keywords. By default none */
  allowedKeywords: string[]
}

interface NonNormalizedApplication {
  title: string
  description: string
  todos?: string[]
  links?: Link[]
  errors?: ImplementationError[]
}

interface NonNormalizedModule {
  $id: string
  title: string
  description: string
  todos?: string[]
  links?: Link[]
  errors?: ImplementationError[]
}

interface NonNormalizedSchema {
  $id: string
  title: string
  'x-schema-type': SchemaType
  type?: string
  definitions?: Record<string, NonNormalizedSubSchema>
  oneOf?: NonNormalizedSubSchema[]
  properties?: Record<string, NonNormalizedSubSchema>
  required?: string[]
  enum?: string[] | undefined
  'x-todos'?: string[]
  'x-links'?: Link[]
  'x-errors'?: ImplementationError[]
}

interface NonNormalizedSubSchema {
  oneOf?: NonNormalizedSubSchema[]
  properties?: Record<string, NonNormalizedSubSchema>
  required?: string[]
  $ref?: string
  type?: string
  items?: NonNormalizedSubSchema
  enum?: string[]
}

interface NormalizerResult<T> {
  result: T
  definitions: Record<string, NonNormalizedSubSchema>
}

/**
 * Normalizes the input to an "DefaultInput" according to {@link Model}
 */
export class InputNormalizer {
  readonly #noAdditionalPropertiesInExamples: boolean
  readonly #applications: Application[] = []
  readonly #schemas: Schema[] = []
  readonly #modules: Module[] = []
  readonly #ajv: Ajv

  public constructor (optionsOrUndefined?: Partial<InputNormalizerOptions>) {
    const options = applyDefaults(optionsOrUndefined)
    this.#noAdditionalPropertiesInExamples = options.noAdditionalPropertiesInExamples
    this.#ajv = new Ajv(options.ajvOptions)
    this.#ajv.addSchema(this.readYamlFile(path.join(__dirname, 'inputDefinition', '_Application.yaml')))
    this.#ajv.addSchema(this.readYamlFile(path.join(__dirname, 'inputDefinition', '_Module.yaml')))
    this.#ajv.addSchema(this.readYamlFile(path.join(__dirname, 'inputDefinition', '_Schema.yaml')))
    options.allowedFormats.forEach(f => this.#ajv.addFormat(f.name, f.avjFormat))
    this.#ajv.addKeyword('x-schema-type')
    this.#ajv.addKeyword('x-references')
    this.#ajv.addKeyword('x-enum-description')
    this.#ajv.addKeyword('x-todos')
    this.#ajv.addKeyword('x-links')
    this.#ajv.addKeyword('x-errors')
    options.allowedKeywords.forEach(f => this.#ajv.addKeyword(f))
  }

  /**
   * Adds an read application object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   */
  public addApplication (parsed: unknown, fileLocation: string): void {
    this.ajvValidate(parsed, '_Application.yaml', fileLocation)
    const nonNormalizedApplication = parsed as NonNormalizedApplication
    const application: Application = {
      ...nonNormalizedApplication,
      errors: nonNormalizedApplication.errors ?? [],
      todos: nonNormalizedApplication.todos ?? [],
      links: nonNormalizedApplication.links ?? []
    }
    this.#applications.push(application)
  }

  /**
   * Adds an read module object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   * @param expectedId An expected ID that should be in this object (e.g. from filename) or none, if no ID is expected
   */
  public addModule (parsed: unknown, fileLocation: string, expectedId?: string): void {
    this.ajvValidate(parsed, '_Module.yaml', fileLocation)
    const nonNormalizedModule = parsed as NonNormalizedModule
    this.validateId(nonNormalizedModule, fileLocation, expectedId)
    const module: Module = {
      ...nonNormalizedModule,
      errors: nonNormalizedModule.errors ?? [],
      todos: nonNormalizedModule.todos ?? [],
      links: nonNormalizedModule.links ?? []
    }
    this.#modules.push(module)
  }

  /**
   * Adds an read schema object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   * @param expectedId The expected ID that should be in this object (e.g. from filename) or none, if no ID is expected
   */
  public addSchema (parsed: unknown, fileLocation: string, expectedId?: string): void {
    this.ajvValidate(parsed, '_Schema.yaml', fileLocation)
    const inputSchema = parsed as NonNormalizedSchema
    this.validateId(inputSchema, fileLocation, expectedId)
    this.validateEnumDocumentation(fileLocation, inputSchema)
    this.validateRequired(fileLocation, inputSchema)
    const schema = this.normalizeSchema(inputSchema)
    this.addSchemaToAjv(schema)
    this.#schemas.push(schema)
  }

  /**
   * Convert the read in object to a normalized model
   * @returns The normalized model
   */
  public toModel (): Model {
    if (this.#applications.length === 0) throw new Error('No application file found')
    this.#modules.forEach(m => {
      this.verifyReferences(m, m)
    })
    this.#schemas.forEach(m => {
      this.verifyReferences(m, m)
    })
    this.#schemas.forEach(m => {
      this.verifyExamples(m)
    })
    return { application: this.#applications[0], modules: this.#modules, schemas: this.#schemas }
  }

  private readYamlFile (filePath: string): AnySchema {
    return yaml.parse(fs.readFileSync(filePath).toString())
  }

  private ajvValidate (parsed: unknown, schemaFile: string, fileLocation: string): void {
    if (this.#ajv.validate(schemaFile, parsed)) return
    throw new Error(`Invalid file ${fileLocation}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
  }

  private addSchemaToAjv (s: Schema): void {
    if (s.type !== 'object') {
      this.#ajv.addSchema(s, s.$id)
      return
    }
    if (!this.#noAdditionalPropertiesInExamples) {
      this.#ajv.addSchema(s, s.$id)
      return
    }
    const m2 = structuredClone(s) as any
    m2.additionalProperties = false
    this.#ajv.addSchema(m2 as AnySchema, s.$id)
  }

  private validateId (parsed: { $id: string }, fileLocation: string, expectedId?: string): void {
    if (expectedId === undefined) return
    if (parsed.$id === expectedId) return
    throw new Error(`Invalid $id in file ${fileLocation}. It must be the same as the file path '${expectedId}' but is '${parsed.$id}'`)
  }

  private validateEnumDocumentation (fileLocation: string, subSchema: unknown): void {
    if (subSchema === null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.validateEnumDocumentation(fileLocation, value)
    })

    if (!('enum' in subSchema)) {
      if (('x-enum-description' in subSchema)) {
        console.error(`File ${fileLocation} has a Schema with an 'x-enum-description' but is not an enum`)
      }
      return
    }
    if (!('x-enum-description' in subSchema)) {
      return
    }
    const enumValues = subSchema.enum as string[]
    const enumDescriptions = subSchema['x-enum-description'] as Record<string, string>
    const documentedValues = Object.keys(enumDescriptions)
    documentedValues.filter(k => !enumValues.includes(k)).forEach(k => {
      throw new Error(`File ${fileLocation} has an 'x-enum-description' for enum value '${k}' that does not exist`)
    })
    enumValues.filter(k => !documentedValues.includes(k)).forEach(k => {
      throw new Error(`File ${fileLocation} has an 'x-enum-description' but is missing documentation for enum value '${k}'`)
    })
  }

  private validateRequired (fileLocation: string, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.validateRequired(fileLocation, value)
    })

    if (!('required' in subSchema)) return
    const required = subSchema.required as string[]
    const properties = 'properties' in subSchema ? Object.keys(subSchema.properties as Record<string, unknown>) : []
    required
      .filter(r => !properties.includes(r))
      .forEach(r => {
        throw new Error(`File ${fileLocation} has a required property '${r}' that is not defined`)
      })
  }

  private verifyReferences (root: Schema | Module, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.verifyReferences(root, value)
    })

    const references: string[] = []
    if ('$ref' in subSchema) {
      references.push(subSchema.$ref as string)
    }
    if ('x-references' in subSchema) {
      if (Array.isArray(subSchema['x-references'])) {
        references.push(...subSchema['x-references'] as string[])
      } else {
        references.push(subSchema['x-references'] as string)
      }
    }
    references
      .filter(r => !r.startsWith('#'))
      .filter((r: string) => !this.#schemas.find(m => m.$id === resolveRelativeId(root.$id, r)))
      .forEach((r: string) => {
        throw new Error(`Invalid Reference '${r}' in Schema ${root.$id}`)
      })
  }

  private verifyExamples (s: Schema): void {
    const schemaType = 'x-schema-type' in s ? s['x-schema-type'] : 'Entity'
    if (!('examples' in s) || s.examples === undefined || s.examples.length === 0) {
      if (schemaType === 'Aggregate' || schemaType === 'ReferenceData') {
        console.error(`Schema ${s.$id} is an ${schemaType} and should have at least one example.`)
      }
      return
    }
    const examples = s.examples
    examples.forEach((e, i) => {
      if (!this.#ajv.validate(s.$id, e)) {
        throw new Error(`Invalid example [${i}] in Schema ${s.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
      }
    })
  }

  private normalizeSchema (schema: NonNormalizedSchema): Schema {
    if (schema.oneOf) {
      if (schema.enum) {
        throw new Error(`Schema ${schema.$id} is an interface and an enum`)
      }
      if (schema.properties) {
        throw new Error(`Schema ${schema.$id} is an interface and an object`)
      }
      const name = cleanName(schema.title)
      const cleaned = this.normalizeOneOf(schema.oneOf, name)
      return {
        ...schema,
        type: 'object',
        oneOf: cleaned.result,
        definitions: this.normalizeDefinitions({ ...schema.definitions ?? {}, ...cleaned.definitions }),
        'x-links': schema['x-links'] ?? [],
        'x-errors': schema['x-errors'] ?? [],
        'x-todos': schema['x-todos'] ?? []
      }
    }

    if (schema.enum !== undefined) {
      if (schema.properties) {
        throw new Error(`Schema ${schema.$id} is an enum and an object`)
      }
      return {
        ...schema,
        enum: schema.enum,
        type: 'string',
        definitions: this.normalizeDefinitions(schema.definitions ?? {}),
        'x-links': schema['x-links'] ?? [],
        'x-errors': schema['x-errors'] ?? [],
        'x-todos': schema['x-todos'] ?? []
      }
    }

    if (schema.properties) {
      const cleaned = this.normalizeProperties(schema.properties)
      return {
        ...schema,
        type: 'object',
        properties: cleaned.result,
        required: schema.required ?? [],
        definitions: this.normalizeDefinitions({ ...schema.definitions ?? {}, ...cleaned.definitions }),
        'x-links': schema['x-links'] ?? [],
        'x-errors': schema['x-errors'] ?? [],
        'x-todos': schema['x-todos'] ?? []
      }
    }
    throw new Error(`Schema ${schema.$id} is not an interface, object or enum`)
  }

  private normalizeOneOf (oneOf: NonNormalizedSubSchema[], name: string): NormalizerResult<RefProperty[]> {
    const result: RefProperty[] = []
    const definitions: Record<string, NonNormalizedSubSchema> = {}
    oneOf.forEach((oneOf, index) => {
      if (oneOf.$ref !== undefined) {
        const p: RefProperty = { ...oneOf, $ref: oneOf.$ref }
        result.push(p)
      } else {
        const definitionName = `${name}${index + 1}`
        result.push({ $ref: `#/definitions/${definitionName}` })
        definitions[definitionName] = oneOf
      }
    })
    return ({ result, definitions })
  }

  private normalizeProperties (properties: Record<string, NonNormalizedSubSchema>): NormalizerResult<Record<string, Property>> {
    const result: Record<string, Property> = {}
    const definitions: Record<string, NonNormalizedSubSchema> = {}
    Object.entries(properties).forEach(([propertyName, property]) => {
      const cleaned = this.normalizeProperty(property, cleanName(propertyName))
      result[propertyName] = cleaned.result
      Object.entries(cleaned.definitions).forEach(([defName, definition]) => {
        definitions[defName] = definition
      })
    })
    return ({ result, definitions })
  }

  private normalizeProperty (property: NonNormalizedSubSchema, name: string): NormalizerResult<Property> {
    if (property.$ref !== undefined) {
      const result: RefProperty = { ...property, $ref: property.$ref }
      return { result, definitions: {} }
    }
    if (property.type === 'array' && property.items) {
      const cleanItem = this.normalizeProperty(property.items, name)
      const result: ArrayProperty = { ...property, type: 'array', items: cleanItem.result }
      return { result, definitions: cleanItem.definitions }
    }
    if (property.properties ?? property.oneOf ?? property.enum) {
      const result: RefProperty = { $ref: `#/definitions/${name}` }
      return { result, definitions: { [name]: property } }
    }
    if (property.type === undefined || (property.type !== 'boolean' && property.type !== 'integer' && property.type !== 'null' && property.type !== 'number' && property.type !== 'string')) {
      console.error(`Invalid type ${property.type} for property ${name}. Assuming string`)
      const result: BasicProperty = { ...property, type: 'string' }
      return ({ result, definitions: {} })
    }

    const result: BasicProperty = { ...property, type: property.type }
    return ({ result, definitions: {} })
  }

  private normalizeDefinitions (definitions: Record<string, NonNormalizedSubSchema>): Record<string, Definition> {
    const result: Record<string, Definition> = {}
    Object.entries(definitions).forEach(([oldName, oldDefinition]) => {
      const cleaned = this.normalizeDefinition(oldDefinition, oldName)
      Object.entries(cleaned).forEach(([newName, newDefinition]) => {
        result[newName] = newDefinition
      })
    })
    return result
  }

  private normalizeDefinition (definition: NonNormalizedSubSchema, name: string): Record<string, Definition> {
    if (definition.oneOf) {
      const cleaned = this.normalizeOneOf(definition.oneOf, name)
      const result: InterfaceDefinition = { ...definition, type: 'object', oneOf: cleaned.result }
      return { [name]: result, ...this.normalizeDefinitions(cleaned.definitions) }
    } else if (definition.properties) {
      const cleaned = this.normalizeProperties(definition.properties)
      const result: ObjectDefinition = {
        required: [],
        ...definition,
        type: 'object',
        properties: cleaned.result
      }
      return { [name]: result, ...this.normalizeDefinitions(cleaned.definitions) }
    } else if (definition.enum !== undefined) {
      const result: EnumDefinition = { ...definition, type: 'string', enum: definition.enum }
      return { [name]: result }
    } else {
      throw new Error('A definition cannot be a base type. Only enums, oneOf or objects are allowed')
    }
  }
}

function applyDefaults (optionsOrUndefined?: Partial<InputNormalizerOptions>): InputNormalizerOptions {
  return {
    noAdditionalPropertiesInExamples: optionsOrUndefined?.noAdditionalPropertiesInExamples ?? true,
    ajvOptions: optionsOrUndefined?.ajvOptions ?? { allErrors: true, discriminator: true },
    allowedFormats: optionsOrUndefined?.allowedFormats ?? defaultFormats,
    allowedKeywords: optionsOrUndefined?.allowedKeywords ?? []
  }
}

/**
 * The default list of formats to support. Basically all from avjFormats
 * @see {@link https://ajv.js.org/packages/ajv-formats.html}
 */
export const defaultFormats = Object.keys(fullFormats).map(name => ({ name, avjFormat: fullFormats[name as FormatName] }))
