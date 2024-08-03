import { cleanName } from '../reader/InputHelper'
import type { EnumDefinition, InterfaceDefinition, ObjectDefinition, RefProperty, Property, NormalizedSchema, StringProperty, BooleanProperty, ArrayProperty, NumberProperty, Definition } from './NormalizedSchema'
import { type JSONSchema7Definition, type JSONSchema7 } from 'json-schema'
import { type SchemaNormalizerError } from './SchemaNormalizerError'
import { type SchemaNormalizerOptions } from './SchemaNormalizerOptions'
import { basename, extname } from 'path'

export class SchemaNormalizer {
  #definitionsToProcess: Array<{ name: string, path: string[], definition: JSONSchema7 }> = []
  #title: string = ''
  #id: string = ''
  #errors: SchemaNormalizerError[] = []
  readonly #options: SchemaNormalizerOptions

  constructor (options?: Partial<SchemaNormalizerOptions>) {
    this.#options = {
      allowedKeywords: options?.allowedKeywords ?? [],
      failOnNotSupportedProperties: options?.failOnNotSupportedProperties ?? true
    }
  }

  /**
   * Normalizes the input. There are many ways how to write a JSON-Schema, but we do want to consistency to work with
   * So let's normalize the input so that it fits {@link NormalizedSchema}
   * @param input The schema to normalize
   * @returns The normalized schema
   */
  public normalize (input: JSONSchema7): NormalizedSchema {
    this.#definitionsToProcess = []
    this.#id = input.$id ?? 'Schema'
    this.#title = input.title ?? basename(this.#id, extname(this.#id))
    this.#errors = []

    if (input.$id === undefined) this.#errors.push({ path: ['$id'], type: 'MISSING_REQUIRED_PROPERTY', message: 'Schema must define an ID' })
    if (input.$schema !== undefined && input.$schema !== 'http://json-schema.org/draft-07/schema#') {
      this.#errors.push({ path: ['$schema'], type: 'NOT_SUPPORTED_VALUE', message: 'Only \'http://json-schema.org/draft-07/schema#\' is supported', value: input.$schema })
    }

    const rootDefinition = this.toDefinition(input, [])
    const subDefinitions: Record<string, Definition> = {}
    while (this.#definitionsToProcess.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const d = this.#definitionsToProcess.pop()!
      subDefinitions[d.name] = this.toDefinition(d.definition, d.path)
    }
    return {
      ...rootDefinition,
      $id: this.#id,
      title: this.#title,
      examples: this.getExamples(input),
      definitions: subDefinitions
    }
  }

  public getErrors (): SchemaNormalizerError[] {
    return [...this.#errors]
  }

  private getExamples (input: JSONSchema7): unknown[] | undefined {
    if (input.examples === undefined) {
      return undefined
    }
    if (Array.isArray(input.examples)) {
      return input.examples
    }
    return [input.examples]
  }

  private toDefinition (input: JSONSchema7, path: string[]): Definition {
    this.processDefinitions(input, path)

    if (input.type === 'string') {
      return this.toEnumDefinition(input, path)
    }
    if (input.oneOf !== undefined) {
      return this.toInterfaceDefinition(input, path)
    }
    return this.toObjectDefinition(input, path)
  }

  private toEnumDefinition (input: JSONSchema7, path: string[]): EnumDefinition {
    let enumD = input.enum
    if (enumD === undefined) {
      this.#errors.push({ path: [...path, 'enum'], type: 'MISSING_REQUIRED_PROPERTY', message: 'Top-level string must be an enum' })
      enumD = []
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const enumValues = enumD.flatMap((value, index) => {
      if (typeof value !== 'string') {
        this.#errors.push({ path: [...path, `enum[${index}]`], value, type: 'NOT_SUPPORTED_VALUE', message: 'Only string enum values are supported' })
        return []
      }
      return [value]
    })
    return {
      ...this.keepProperties(input, 'enum', path),
      type: 'string',
      enum: enumValues,
      $comment: input.$comment,
      description: input.description
    }
  }

  private toInterfaceDefinition (input: JSONSchema7, path: string[]): InterfaceDefinition {
    const properties: Record<string, Property> = {}
    Object.entries(input.properties ?? {}).forEach(([propertyName, property]) => {
      properties[propertyName] = this.toProperty(property, [...path, propertyName])
    })
    const additionalProperties = input.additionalProperties !== undefined
      ? this.toAdditionalProperties(input.additionalProperties, [...path, 'additionalProperties'])
      : undefined
    const oneOf: RefProperty[] = []
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    input.oneOf!.forEach((o, index) => {
      if (typeof o === 'boolean') {
        this.#errors.push({ path: [...path, `oneOf[${index}]`], value: o, type: 'NOT_SUPPORTED_VALUE', message: 'Only objects are supported' })
        return
      }
      if (o.$ref !== undefined) {
        const p: RefProperty = { ...this.keepProperties(o, 'ref', path), $ref: o.$ref }
        oneOf.push(p)
      } else {
        const name = `${path.map(p => cleanName(p)).join('')}OneOf${index + 1}`
        oneOf.push({ $ref: `#/definitions/${name}` })
        this.#definitionsToProcess.push({ name, path: [...path, `oneOf[${index}]`], definition: o })
      }
    })
    return {
      ...this.keepProperties(input, 'interface', path),
      type: 'object',
      oneOf,
      properties,
      additionalProperties,
      required: input.required ?? [],
      $comment: input.$comment,
      maxProperties: input.maxProperties,
      minProperties: input.minProperties,
      description: input.description
    }
  }

  private toObjectDefinition (input: JSONSchema7, path: string[]): ObjectDefinition {
    const properties: Record<string, Property> = {}
    Object.entries(input.properties ?? {}).forEach(([propertyName, property]) => {
      properties[propertyName] = this.toProperty(property, [...path, propertyName])
    })
    const additionalProperties = input.additionalProperties !== undefined
      ? this.toAdditionalProperties(input.additionalProperties, [...path, 'additionalProperties'])
      : undefined
    return {
      ...this.keepProperties(input, 'object', path),
      type: 'object',
      properties,
      additionalProperties,
      required: input.required ?? [],
      $comment: input.$comment,
      maxProperties: input.maxProperties,
      minProperties: input.minProperties,
      description: input.description
    }
  }

  private toProperty (input: JSONSchema7Definition, path: string[]): Property {
    if (typeof input === 'boolean') {
      this.#errors.push({ path, value: input, type: 'NOT_SUPPORTED_VALUE', message: 'Only objects are supported' })
      return { type: 'object' }
    }
    this.processDefinitions(input, path)
    const type = input.type
    if (input.$ref !== undefined) return this.toRefProperty(input, path)
    if (input.properties !== undefined) return this.toDefinitionRefProperty(input, path)
    if (input.oneOf !== undefined) return this.toDefinitionRefProperty(input, path)
    if (input.enum !== undefined) return this.toDefinitionRefProperty(input, path)
    if (type === 'object') return this.toDefinitionRefProperty(input, path)
    if (type === 'array') return this.toArrayProperty(input, path)
    if (type === 'string') return this.toStringProperty(input, path)
    if (type === 'boolean') return this.toBooleanProperty(input, path)
    if (type === 'number') return this.toNumberProperty(input, path)
    if (type === 'integer') return this.toNumberProperty(input, path)
    if (type === 'null') return { ...this.keepProperties(input, 'property', path), type: 'object' }

    this.#errors.push({ path: [...path, 'type'], value: input.type, type: 'NOT_SUPPORTED_VALUE', message: 'Only object, array, string, boolean, number, integer, null are supported' })
    return { ...this.keepProperties(input, 'property', path), type: 'object' }
  }

  private toRefProperty (input: JSONSchema7, path: string[]): RefProperty {
    return {
      ...this.keepProperties(input, 'ref', path),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      $ref: input.$ref!,
      readOnly: input.readOnly,
      writeOnly: input.writeOnly
    }
  }

  private toDefinitionRefProperty (input: JSONSchema7, path: string[]): RefProperty {
    const name = path.map(p => cleanName(p)).join('')
    this.#definitionsToProcess.push({ name, path, definition: input })
    return { $ref: `#/definitions/${name}` }
  }

  private toArrayProperty (input: JSONSchema7, path: string[]): ArrayProperty {
    let items: Property
    if (input.items === undefined) {
      items = { type: 'object' }
    } else if (Array.isArray(input.items)) {
      this.#errors.push({ path: [...path, 'items'], value: input.items, type: 'NOT_SUPPORTED_VALUE', message: 'Only a single item definition is supported' })
      items = { type: 'object' }
    } else {
      items = this.toProperty(input.items, [...path, 'items'])
    }
    return {
      ...this.keepProperties(input, 'array', path),
      type: 'array',
      items,
      readOnly: input.readOnly,
      writeOnly: input.writeOnly,
      maxItems: input.maxItems,
      minItems: input.minItems,
      uniqueItems: input.uniqueItems
    }
  }

  private toStringProperty (input: JSONSchema7, path: string[]): StringProperty {
    let constV = input.const
    let defaultV = input.default
    if (constV !== undefined && typeof constV !== 'string') {
      this.#errors.push({ path: [...path, 'const'], value: input.const, type: 'NOT_SUPPORTED_VALUE', message: 'Must be of correct type' })
      constV = undefined
    }
    if (defaultV !== undefined && typeof defaultV !== 'string') {
      this.#errors.push({ path: [...path, 'default'], value: input.default, type: 'NOT_SUPPORTED_VALUE', message: 'Must be of correct type' })
      defaultV = undefined
    }
    return {
      ...this.keepProperties(input, 'string', path),
      type: 'string',
      format: input.format,
      const: constV,
      default: defaultV,
      maxLength: input.maxLength,
      minLength: input.minLength,
      contentEncoding: input.contentEncoding,
      contentMediaType: input.contentMediaType,
      pattern: input.pattern,
      readOnly: input.readOnly,
      writeOnly: input.writeOnly
    }
  }

  private toBooleanProperty (input: JSONSchema7, path: string[]): BooleanProperty {
    let constV = input.const
    let defaultV = input.default
    if (constV !== undefined && typeof constV !== 'boolean') {
      this.#errors.push({ path: [...path, 'const'], value: input.const, type: 'NOT_SUPPORTED_VALUE', message: 'Must be of correct type' })
      constV = undefined
    }
    if (defaultV !== undefined && typeof defaultV !== 'boolean') {
      this.#errors.push({ path: [...path, 'default'], value: input.default, type: 'NOT_SUPPORTED_VALUE', message: 'Must be of correct type' })
      defaultV = undefined
    }
    return {
      ...this.keepProperties(input, 'boolean', path),
      type: 'boolean',
      const: constV,
      default: defaultV,
      readOnly: input.readOnly,
      writeOnly: input.writeOnly,
      format: input.format
    }
  }

  private toNumberProperty (input: JSONSchema7, path: string[]): NumberProperty {
    let constV = input.const
    let defaultV = input.default
    if (constV !== undefined && typeof constV !== 'number') {
      this.#errors.push({ path: [...path, 'const'], value: input.const, type: 'NOT_SUPPORTED_VALUE', message: 'Must be of correct type' })
      constV = undefined
    }
    if (defaultV !== undefined && typeof defaultV !== 'number') {
      this.#errors.push({ path: [...path, 'default'], value: input.default, type: 'NOT_SUPPORTED_VALUE', message: 'Must be of correct type' })
      defaultV = undefined
    }
    return {
      ...this.keepProperties(input, 'number', path),
      type: input.type as NumberProperty['type'],
      const: constV,
      default: defaultV,
      readOnly: input.readOnly,
      writeOnly: input.writeOnly,
      format: input.format,
      minimum: input.minimum,
      maximum: input.maximum,
      exclusiveMaximum: input.exclusiveMaximum,
      exclusiveMinimum: input.exclusiveMinimum,
      multipleOf: input.multipleOf
    }
  }

  private toAdditionalProperties (input: JSONSchema7Definition, path: string[]): boolean | Property {
    if (typeof input === 'boolean') {
      return input
    }
    if (typeof input === 'object') {
      return this.toProperty(input, path)
    }
    this.#errors.push({ path, value: input, type: 'NOT_SUPPORTED_VALUE', message: 'Must be boolean or object' })
    return true
  }

  private processDefinitions (input: JSONSchema7, path: string[]): void {
    const definitions = input.definitions
    if (definitions === undefined) return
    Object.entries(definitions).forEach(([name, definition]) => {
      if (typeof definition === 'boolean') {
        this.#errors.push({ path: [...path, 'definitions', name], type: 'NOT_SUPPORTED_VALUE', message: 'Only objects are supported', value: definition })
        this.#definitionsToProcess.push({ name, path: [...path, 'definitions', name], definition: { type: 'object' } })
      } else {
        this.#definitionsToProcess.push({ name, path: [...path, 'definitions', name], definition })
      }
    })
  }

  private keepProperties (input: JSONSchema7, type: KeepPropertiesTypes, path: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    Object.entries(input).forEach(([key, value]) => {
      if (this.#options.allowedKeywords.includes(key)) {
        result[key] = value
        return
      }
      if (key.startsWith('x-')) {
        result[key] = value
        return
      }
      if (alwaysAllowed.includes(key)) {
        result[key] = value
        return
      }
      if (propertyTypes.includes(type) && allowedProperties.property.includes(key)) {
        result[key] = value
        return
      }
      if (allowedProperties[type].includes(key)) {
        result[key] = value
        return
      }
      const message = neverAllowed.includes(key) ? `${key} is not supported` : `${key} is not supported for an schema of type ${type}`
      if (this.#options.failOnNotSupportedProperties) {
        this.#errors.push({ path: [...path, key], value, type: 'NOT_SUPPORTED_PROPERTY', message })
      } else {
        console.error(`${message} at ${path.join('.')} of schema ${this.#id}`)
      }
    })
    return result
  }
}

type KeepPropertiesTypes = 'interface' | 'object' | 'enum' | 'ref' | 'array' | 'string' | 'number' | 'boolean' | 'property'
const propertyTypes: KeepPropertiesTypes[] = ['ref', 'array', 'string', 'number', 'boolean', 'object']
const alwaysAllowed = ['$id', '$schema', '$comment', 'type', 'definitions', 'title', 'description', 'examples']
const neverAllowed = ['dependencies', '$defs', 'if', 'then', 'else', 'not', 'allOf', 'anyOf', 'patternProperties', 'propertyNames', 'additionalItems', 'contains']
const allowedProperties: Record<KeepPropertiesTypes, string[]> = {
  interface: ['maxProperties', 'minProperties', 'additionalProperties', 'properties', 'required', 'oneOf'],
  object: ['maxProperties', 'minProperties', 'additionalProperties', 'properties', 'required'],
  enum: ['enum'],
  property: ['readOnly', 'writeOnly'],
  ref: ['$ref'],
  array: ['items', 'maxItems', 'minItems', 'uniqueItems'],
  string: ['default', 'const', 'maxLength', 'minLength', 'pattern', 'contentMediaType', 'contentEncoding', 'format'],
  number: ['default', 'const', 'multipleOf', 'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum', 'format'],
  boolean: ['default', 'const', 'format']
}
