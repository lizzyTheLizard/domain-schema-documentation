import {
  type ArrayProperty, type BasicProperty,
  type Definition, type EnumDefinition, type InterfaceDefinition, type ObjectDefinition,
  type ObjectProperty,
  type Property,
  type Schema,
  type SchemaType
} from '../input/Schema.ts'
import { cleanName } from '../input/InputHelper.ts'
import { type Link } from '../input/Input.ts'

interface NormalizerInput {
  $id: string
  title: string
  'x-schema-type': SchemaType
  type?: string
  'x-tags'?: Record<string, string>
  'x-todos'?: string[]
  'x-links'?: Link[]
  description?: string
  examples?: unknown[]
  definitions?: Record<string, NormalizerSubInput>
  oneOf?: NormalizerSubInput[]
  properties?: Record<string, NormalizerSubInput>
  required?: string[]
  enum?: string[] | undefined
}

interface NormalizerSubInput {
  oneOf?: NormalizerSubInput[]
  properties?: Record<string, NormalizerSubInput>
  required?: string[]
  $ref?: string
  type?: string
  items?: NormalizerSubInput
  enum?: string[]
}

export function inputNormalizer (schema: NormalizerInput): Schema {
  if (schema.oneOf) {
    if (schema.enum) {
      throw new Error(`Schema ${schema.$id} is an interface and an enum`)
    }
    if (schema.properties) {
      throw new Error(`Schema ${schema.$id} is an interface and an object`)
    }
    const name = cleanName(schema.title)
    const cleaned = cleanOneOf(schema.oneOf, name)
    return {
      ...schema,
      type: 'object',
      oneOf: cleaned.result,
      definitions: cleanDefinitions({ ...schema.definitions ?? {}, ...cleaned.definitions })
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
      definitions: cleanDefinitions(schema.definitions ?? {})
    }
  }

  if (schema.properties) {
    const name = cleanName(schema.title)
    const cleaned = cleanProperties(schema.properties, name)
    return {
      ...schema,
      type: 'object',
      properties: cleaned.result,
      required: schema.required ?? [],
      definitions: cleanDefinitions({ ...schema.definitions ?? {}, ...cleaned.definitions })
    }
  }
  throw new Error(`Schema ${schema.$id} is not an interface, object or enum`)
}

function cleanOneOf (oneOf: NormalizerSubInput[], name: string): { result: ObjectProperty[], definitions: Record<string, NormalizerSubInput> } {
  const result: ObjectProperty[] = []
  const definitions: Record<string, NormalizerSubInput> = {}
  oneOf.forEach((oneOf, index) => {
    if (oneOf.$ref !== undefined) {
      const p: ObjectProperty = { ...oneOf, type: 'object', $ref: oneOf.$ref }
      result.push(p)
    } else {
      const definitionName = `OneOf${name}${index + 1}`
      result.push({ type: 'object', $ref: `#/definitions/${definitionName}` })
      definitions[definitionName] = oneOf
    }
  })
  return ({ result, definitions })
}

function cleanProperties (properties: Record<string, NormalizerSubInput>, name: string): { result: Record<string, Property>, definitions: Record<string, NormalizerSubInput> } {
  const result: Record<string, Property> = {}
  const definitions: Record<string, NormalizerSubInput> = {}
  Object.entries(properties).forEach(([propertyName, property]) => {
    const cleaned = cleanProperty(property, name + cleanName(propertyName))
    result[propertyName] = cleaned.result
    Object.entries(cleaned.definitions).forEach(([defName, definition]) => {
      definitions[defName] = definition
    })
  })
  return ({ result, definitions })
}

function cleanProperty (property: NormalizerSubInput, name: string): { result: Property, definitions: Record<string, NormalizerSubInput> } {
  if (property.$ref !== undefined) {
    const result: ObjectProperty = { ...property, $ref: property.$ref, type: 'object' }
    return { result, definitions: {} }
  }
  if (property.type === 'array' && property.items) {
    const cleanItem = cleanProperty(property.items, name)
    const result: ArrayProperty = { ...property, type: 'array', items: cleanItem.result }
    return { result, definitions: cleanItem.definitions }
  }
  if (property.properties ?? property.oneOf ?? property.enum) {
    const result: ObjectProperty = { type: 'object', $ref: `#/definitions/${name}` }
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

function cleanDefinitions (definitions: Record<string, NormalizerSubInput>): Record<string, Definition> {
  const result: Record<string, Definition> = {}
  Object.entries(definitions).forEach(([oldName, oldDefinition]) => {
    const cleaned = cleanDefinition(oldDefinition, oldName)
    Object.entries(cleaned).forEach(([newName, newDefinition]) => {
      result[newName] = newDefinition
    })
  })
  return result
}

function cleanDefinition (definition: NormalizerSubInput, name: string): Record<string, Definition> {
  if (definition.oneOf) {
    const cleaned = cleanOneOf(definition.oneOf, name)
    const result: InterfaceDefinition = { ...definition, type: 'object', oneOf: cleaned.result }
    return { [name]: result, ...cleanDefinitions(cleaned.definitions) }
  } else if (definition.properties) {
    const cleaned = cleanProperties(definition.properties, name)
    const result: ObjectDefinition = { required: [], ...definition, type: 'object', properties: cleaned.result }
    return { [name]: result, ...cleanDefinitions(cleaned.definitions) }
  } else if (definition.enum !== undefined) {
    const result: EnumDefinition = { ...definition, type: 'string', enum: definition.enum }
    return { [name]: result }
  } else {
    throw new Error('A definition cannot be a base type. Only enums, oneOf or objects are allowed')
  }
}
