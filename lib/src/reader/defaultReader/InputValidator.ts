import Ajv, { type Format, type AnySchema, type Options } from 'ajv'
import type { Module, Schema, Definition, SchemaType, ImplementationError, Link } from '../Reader'
import { resolveRelativeId } from '../helper/InputHelper'
import betterAjvErrors from 'better-ajv-errors'
import * as fs from 'fs'
import * as yaml from 'yaml'
import path from 'path'
import { type DefaultInputNormalizerOptions } from './DefaultInputNormalizer'

/**
 * Options for the InputValidator
 */
export interface InputValidatorOptions {
  /**
   * Options given to ajv. By default {allErrors: true}
   * @see {@link https://ajv.js.org/options.html}
   */
  ajvOptions: Options
  /**
   * If "additionalProperties" is not set on an schema, by default all additional properties are allowed
   * {@link https://json-schema.org/draft/2020-12/json-schema-core#name-additionalproperties}
   * This is not always what you want. With this option you can overwrite this behaviour:
   * 'ALWAYS': When not explicitely set, additionalProperties is set to 'true' (JSON-Schema default)
   * 'NEVER': When not explicitely set, additionalProperties is set to 'false' (not recommended, use INTERFACE instead)
   * 'INTERFACE': When not explicitely set, additionalProperties is set to 'false' except if there is a 'oneOf'
   * Reason for 'INTERFACE' is  that JSON Schema does not support validation in 'oneOf's {@link https://ajv.js.org/faq.html#additional-properties-inside-compound-keywords-anyof-oneof-etc}
   */
  allowAdditionalPropertiesInExamples: 'ALWAYS' | 'NEVER' | 'INTERFACE'
  /**
   * Discriminator is not an JSON-Schema but an OpenAPI keyword. By default, JSON-Schema does not support it.
   * Can either be 'AJV' (AJV default, see {@link https://ajv.js.org/json-schema.html#discriminator},
   * limited support e.g. no mappings but fully validated through AJV), 'ALLOW' (any kind of discriminator is allowed, no checks whatsoever) or
   * 'DENY' (no discriminator allowed, fully validated through AJV)
   */
  discriminator: 'AJV' | 'ALLOW' | 'DENY'
  /**
   * Allowed formats. By default the formats of ajv-formats
   * @see {@link https://ajv.js.org/packages/ajv-formats.html}
   */
  allowedFormats: Array<{ name: string, avjFormat: Format }>
  /** Allowed additional keywords. By default none */
  allowedKeywords: string[]
}

/**
 * Validates the input, both if it's is a valid JSON-Schema as well as if it follows all the rules
 */
export class InputValidator {
  readonly #ajv: Ajv
  readonly #ids: string[] = []

  public constructor (private readonly options: DefaultInputNormalizerOptions) {
    this.#ajv = this.setUpAjv()
  }

  public validateApplicationFile (parsed: unknown, fileLocation: string): NonNormalizedApplication {
    this.validateAjv(parsed, '_Application.yaml', `file ${fileLocation}`)
    return parsed as NonNormalizedApplication
  }

  public validateModuleFile (parsed: unknown, fileLocation: string, expectedId?: string): NonNormalizedModule {
    this.validateAjv(parsed, '_Module.yaml', `file ${fileLocation}`)
    const nonNormalizedModule = parsed as { $id: string }
    this.validateId(nonNormalizedModule, fileLocation, expectedId)
    return parsed as NonNormalizedModule
  }

  public validateSchemaFile (parsed: unknown, fileLocation: string, expectedId?: string): NonNormalizedSchema {
    this.validateAjv(parsed, '_Schema.yaml', `file ${fileLocation}`)
    const inputSchema = parsed as { $id: string }
    this.validateId(inputSchema, fileLocation, expectedId)
    this.validateEnumDocumentation(fileLocation, inputSchema)
    this.validateRequired(fileLocation, inputSchema)
    return parsed as NonNormalizedSchema
  }

  public addSchemaToAjv (schema: Schema): void {
    // Before we can add the schema to AJV, we need to set allowAdditionalProperties depending on the options
    // This needs to be done for each definition and the schema itself
    const definitions: Record<string, unknown> = {}
    Object.entries(schema.definitions).forEach(([definitionName, definition]) => {
      definitions[definitionName] = { ...definition, additionalProperties: this.allowAdditionalProperties(definition) }
    })
    const schemaToAdd = {
      ...schema,
      definitions,
      additionalProperties: this.allowAdditionalProperties(schema)
    }
    this.#ajv.addSchema(schemaToAdd, schema.$id)
    this.#ids.push(schema.$id)
  }

  private setUpAjv (): Ajv {
    const ajv = new Ajv({ ...this.options.ajvOptions, discriminator: this.options.discriminator === 'AJV' })
      .addSchema(readYamlFile(path.join(__dirname, '../inputDefinition', '_Application.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, '../inputDefinition', '_Module.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, '../inputDefinition', '_Schema.yaml')))
      .addKeyword('x-schema-type')
      .addKeyword('x-references')
      .addKeyword('x-enum-description')
      .addKeyword('x-todos')
      .addKeyword('x-links')
      .addKeyword('x-errors')
    if (this.options.discriminator === 'ALLOW') ajv.addKeyword('discriminator')
    this.options.allowedKeywords.forEach(f => ajv.addKeyword(f))
    this.options.allowedFormats.forEach(f => ajv.addFormat(f.name, f.avjFormat))
    return ajv
  }

  private allowAdditionalProperties (d: Definition): unknown {
    if ('additionalProperties' in d) {
      return d.additionalProperties
    } if (d.type !== 'object') {
      return undefined
    } if (this.options.allowAdditionalPropertiesInExamples === 'NEVER') {
      return false
    } if (this.options.allowAdditionalPropertiesInExamples === 'INTERFACE') {
      return 'oneOf' in d
    } if (this.options.allowAdditionalPropertiesInExamples === 'ALWAYS') {
      return true
    }
  }

  public validateExamples (s: Schema): void {
    const schemaType = 'x-schema-type' in s ? s['x-schema-type'] : 'Entity'
    if (!('examples' in s) || s.examples === undefined || s.examples.length === 0) {
      if (schemaType === 'Aggregate' || schemaType === 'ReferenceData') {
        console.error(`Schema ${s.$id} is an ${schemaType} and should have at least one example.`)
      }
      return
    }
    s.examples.forEach((e, i) => { this.validateAjv(e, s.$id, `example ${i} in Schema '${s.$id}'`) })
  }

  private validateAjv (parsed: unknown, schemaFile: string, name: string): void {
    if (this.#ajv.validate(schemaFile, parsed)) return
    const errors = this.#ajv.errors
    if (!errors) {
      throw new Error(`Invalid ${name}: ${this.#ajv.errorsText()}`)
    }
    const schema = this.#ajv.getSchema(schemaFile)
    console.error(`Invalid ${name}`)
    console.error(betterAjvErrors(schema, parsed, errors))
    throw new Error(`Invalid ${name}. See logs for details`)
  }

  private validateId (parsed: { $id: string }, fileLocation: string, expectedId?: string): void {
    if (expectedId === undefined) return
    if (parsed.$id === expectedId) return
    throw new Error(`Invalid file ${fileLocation}. Id must be the same as the file path '${expectedId}' but is '${parsed.$id}'`)
  }

  private validateEnumDocumentation (fileLocation: string, subSchema: unknown): void {
    // As this is not normalized yet, enums could be anywhere, even e.g as part of a property => do this recursively on everything
    if (subSchema === null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.validateEnumDocumentation(fileLocation, value)
    })

    if (!('enum' in subSchema)) {
      if (('x-enum-description' in subSchema)) {
        console.error(`Invalid file ${fileLocation}. It has an enum description but is not an enum => Ignore`)
      }
      return
    }
    if (!('x-enum-description' in subSchema)) {
      return
    }
    const enumValues = subSchema.enum as string[]
    const enumDescriptions = subSchema['x-enum-description'] as Record<string, string>
    const documentedValues = Object.keys(enumDescriptions)
    enumValues.filter(k => !documentedValues.includes(k)).forEach(k => {
      throw new Error(`Invalid file ${fileLocation}. It has an enum description but no description for value '${k}'`)
    })
    documentedValues.filter(k => !enumValues.includes(k)).forEach(k => {
      throw new Error(`Invalid file ${fileLocation}. It has an enum description for '${k}' which is not part of the enum`)
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
        throw new Error(`Invalid file ${fileLocation}. It has a required property '${r}' that is not defined`)
      })
  }

  public validateReferences (root: Schema | Module, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.validateReferences(root, value)
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
      .filter((r: string) => !this.#ids.includes(resolveRelativeId(root.$id, r)))
      .forEach((r: string) => {
        throw new Error(`Invalid Reference '${r}' in Schema '${root.$id}'`)
      })
  }
}

function readYamlFile (filePath: string): AnySchema {
  return yaml.parse(fs.readFileSync(filePath).toString())
}

export interface NonNormalizedSchema {
  $id: string
  title: string
  'x-schema-type': SchemaType
  type?: string
  definitions?: Record<string, NonNormalizedSubSchema>
  oneOf?: NonNormalizedSubSchema[]
  properties?: Record<string, NonNormalizedSubSchema>
  required?: string[]
  enum?: string[] | undefined
  additionalProperties?: NonNormalizedSubSchema | boolean
  'x-todos'?: string[]
  'x-links'?: Link[]
  'x-errors'?: ImplementationError[]
}

export interface NonNormalizedSubSchema {
  oneOf?: NonNormalizedSubSchema[]
  properties?: Record<string, NonNormalizedSubSchema>
  required?: string[]
  $ref?: string
  type?: string
  items?: NonNormalizedSubSchema
  enum?: string[]
  additionalProperties?: NonNormalizedSubSchema | boolean
}

export interface NonNormalizedApplication {
  title: string
  description: string
  todos?: string[]
  links?: Link[]
  errors?: ImplementationError[]
}

export interface NonNormalizedModule {
  $id: string
  title: string
  description: string
  todos?: string[]
  links?: Link[]
  errors?: ImplementationError[]
}
