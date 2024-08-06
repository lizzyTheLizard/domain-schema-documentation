import Ajv, { type Format, type AnySchema, type Options, type Schema as AjvSchema } from 'ajv'
import type { Schema, SchemaType, ImplementationError, Link, Tag } from './Reader'
import { resolveRelativeId } from './InputHelper'
import betterAjvErrors from 'better-ajv-errors'
import * as fs from 'fs'
import * as yaml from 'yaml'
import path from 'path'
import { type JSONSchema7 } from 'json-schema'

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
  allowedFormats: { name: string, avjFormat: Format }[]
  /** Allowed additional keywords. By default none */
  allowedKeywords: string[]
}

/**
 * Validates the input, both if it's is a valid JSON-Schema as well as if it follows all the rules
 */
export class InputValidator {
  readonly #ajv: Ajv
  readonly #ids: string[] = []

  public constructor(private readonly options: InputValidatorOptions) {
    this.#ajv = this.setUpAjv()
  }

  public validateApplicationFile(parsed: unknown, fileLocation: string): NonNormalizedApplication {
    this.validateAjv(parsed, '_Application.yaml', `file ${fileLocation}`)
    return parsed as NonNormalizedApplication
  }

  public validateModuleFile(parsed: unknown, fileLocation: string, expectedId?: string): NonNormalizedModule {
    this.validateAjv(parsed, '_Module.yaml', `file ${fileLocation}`)
    const nonNormalizedModule = parsed as { $id: string }
    this.validateId(nonNormalizedModule, fileLocation, expectedId)
    return parsed as NonNormalizedModule
  }

  public validateSchemaFile(parsed: unknown, fileLocation: string, expectedId?: string): NonNormalizedSchema {
    this.validateAjv(parsed, '_Schema.yaml', `file ${fileLocation}`)
    const inputSchema = parsed as { $id: string }
    this.validateId(inputSchema, fileLocation, expectedId)
    this.validateEnumDocumentation(fileLocation, inputSchema)
    this.validateRequired(fileLocation, inputSchema)
    this.validateConsts(fileLocation, inputSchema)
    return parsed as NonNormalizedSchema
  }

  public addSchemaToAjv(schema: Schema): void {
    this.#ajv.addSchema(schema, schema.$id)
    this.#ids.push(schema.$id)
  }

  private setUpAjv(): Ajv {
    const ajv = new Ajv(this.options.ajvOptions)
      .addSchema(readYamlFile(path.join(__dirname, './inputDefinition', '_Application.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, './inputDefinition', '_Definition.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, './inputDefinition', '_Error.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, './inputDefinition', '_Link.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, './inputDefinition', '_Module.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, './inputDefinition', '_Schema.yaml')))
      .addSchema(readYamlFile(path.join(__dirname, './inputDefinition', '_Tag.yaml')))
      .addKeyword('x-schema-type')
      .addKeyword('x-references')
      .addKeyword('x-enum-description')
      .addKeyword('x-todos')
      .addKeyword('x-links')
      .addKeyword('x-tags')
      .addKeyword('x-errors')
    this.options.allowedKeywords
      .filter(k => !(this.options.ajvOptions.discriminator === true && k.toLowerCase() === 'discriminator'))
      .forEach(f => ajv.addKeyword(f))
    this.options.allowedFormats.forEach(f => ajv.addFormat(f.name, f.avjFormat))
    return ajv
  }

  public validateExamples(s: Schema): void {
    const schemaType = 'x-schema-type' in s ? s['x-schema-type'] : 'Entity'
    if (!('examples' in s) || s.examples === undefined || s.examples.length === 0) {
      if (schemaType === 'Aggregate' || schemaType === 'ReferenceData') {
        console.error(`Schema ${s.$id} is an ${schemaType} and should have at least one example.`)
      }
      return
    }
    s.examples.forEach((e, i) => {
      this.validateAjv(e, s.$id, `example ${i} in Schema '${s.$id}'`)
    })
  }

  private validateAjv(parsed: unknown, schemaOrSchemaId: string | AjvSchema, name: string): void {
    try {
      if (this.#ajv.validate(schemaOrSchemaId, parsed)) return
    } catch (e: unknown) {
      const error = e as Error
      throw new Error(`Invalid ${name}: ${error.message}`)
    }
    const errors = this.#ajv.errors
    if (!errors) {
      throw new Error(`Invalid ${name}: ${this.#ajv.errorsText()}`)
    }
    const schema = typeof schemaOrSchemaId === 'string' ? this.#ajv.getSchema(schemaOrSchemaId) : schemaOrSchemaId
    console.error(betterAjvErrors(schema, parsed, errors, { json: JSON.stringify(parsed, null, ' ') }))
    throw new Error(`Invalid ${name}. See logs for details`)
  }

  private validateId(parsed: { $id: string }, fileLocation: string, expectedId?: string): void {
    if (expectedId === undefined) return
    if (parsed.$id === expectedId) return
    throw new Error(`Invalid file ${fileLocation}. Id must be the same as the file path '${expectedId}' but is '${parsed.$id}'`)
  }

  private validateEnumDocumentation(fileLocation: string, subSchema: unknown): void {
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
    if (!('x-enum-description' in subSchema) || subSchema['x-enum-description'] === null || subSchema['x-enum-description'] === undefined) {
      return
    }
    const enumValues = subSchema.enum as string[]
    const enumDescriptions = subSchema['x-enum-description'] as Record<string, string>
    const documentedValues = Object.keys(enumDescriptions)
    enumValues.filter(k => !documentedValues.includes(k)).forEach((k) => {
      throw new Error(`Invalid file ${fileLocation}. It has an enum description but no description for value '${k}'`)
    })
    documentedValues.filter(k => !enumValues.includes(k)).forEach((k) => {
      throw new Error(`Invalid file ${fileLocation}. It has an enum description for '${k}' which is not part of the enum`)
    })
  }

  private validateRequired(fileLocation: string, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.validateRequired(fileLocation, value)
    })

    if (!('required' in subSchema)) return
    const required = subSchema.required as string[]
    const properties = 'properties' in subSchema ? Object.keys(subSchema.properties as Record<string, unknown>) : []
    required
      .filter(r => !properties.includes(r))
      .forEach((r) => {
        throw new Error(`Invalid file ${fileLocation}. It has a required property '${r}' that is not defined`)
      })
  }

  private validateConsts(fileLocation: string, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.validateConsts(fileLocation, value)
    })
    if (!('const' in subSchema)) return
    const constValue = subSchema.const
    if (!('type' in subSchema) || subSchema.type === 'object') {
      throw new Error(`Invalid constant ${JSON.stringify(constValue)} in ${fileLocation}. Constants are only supported for basic properties`)
    }
    this.validateAjv(constValue, subSchema, `constant ${JSON.stringify(constValue)} in ${fileLocation}`)
  }

  public validateReferences(schema: Schema, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') return
    Object.entries(subSchema).forEach(([_, value]) => {
      this.validateReferences(schema, value)
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
      .filter((r: string) => !this.#ids.includes(resolveRelativeId(schema, r)))
      .forEach((r: string) => {
        throw new Error(`Invalid Reference '${r}' in Schema '${schema.$id}'`)
      })
  }
}

function readYamlFile(filePath: string): AnySchema {
  return yaml.parse(fs.readFileSync(filePath).toString()) as AnySchema
}

export type NonNormalizedSchema = JSONSchema7 & {
  '$id': string
  'title': string
  'x-schema-type': SchemaType
  'x-todos'?: string[]
  'x-links'?: Link[]
  'x-tags'?: Tag[]
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
}

export interface NonNormalizedApplication {
  title: string
  description: string
  todos?: string[]
  links?: Link[]
  errors?: ImplementationError[]
  tags?: Tag[]
}

export interface NonNormalizedModule {
  $id: string
  title: string
  description: string
  todos?: string[]
  links?: Link[]
  errors?: ImplementationError[]
  tags?: Tag[]
}
