import { type ArrayProperty, type Definition, type ObjectProperty, type Property, type Schema, type SchemaCommon } from '../input/Schema.ts'
import { capitalize, getName } from '../input/InputHelper.ts'

export function inputNormalizer (schema: SchemaCommon): Schema {
  switch (getType(schema)) {
    case 'Interface':
      return oneOfNormalizer(schema)
    case 'Enum':
      return enumNormalizer(schema)
    case 'Object':
      return objectNormalizer(schema)
  }
}

function getType (schema: SchemaCommon): 'Interface' | 'Object' | 'Enum' {
  if ('oneOf' in schema) {
    if ('enum' in schema) {
      throw new Error(`Schema ${schema.$id} is an interface and an enum`)
    }
    if ('properties' in schema) {
      throw new Error(`Schema ${schema.$id} is an interface and an object`)
    }
    return 'Interface'
  }

  if ('enum' in schema) {
    if ('properties' in schema) {
      throw new Error(`Schema ${schema.$id} is an enum and an object`)
    }
    return 'Enum'
  }

  if ('properties' in schema) {
    return 'Object'
  }

  throw new Error(`Schema ${schema.$id} is not an interface, object or enum`)
}

function oneOfNormalizer (schema: SchemaCommon): Schema {
  const name = capitalize(getName(schema))
  const cleaned = cleanOneOf(schema, name)
  const oneOf = cleaned.result
  const definitions = schema.definitions !== undefined || Object.keys(cleaned.definitions).length > 0
    ? cleanDefinitions({ ...schema.definitions ?? {}, ...cleaned.definitions })
    : undefined
  return { ...schema, type: 'object', oneOf, definitions }
}

function enumNormalizer (schema: SchemaCommon): Schema {
  const enums = (schema as any).enum as string[]
  const definitions = schema.definitions !== undefined
    ? cleanDefinitions(schema.definitions)
    : undefined
  return { ...schema, type: 'string', enum: enums, definitions }
}

function objectNormalizer (schema: SchemaCommon): Schema {
  const name = capitalize(getName(schema))
  const cleaned = cleanProperties(schema, name)
  const properties = cleaned.result
  const definitions = schema.definitions !== undefined || Object.keys(cleaned.definitions).length > 0
    ? cleanDefinitions({ ...schema.definitions ?? {}, ...cleaned.definitions })
    : undefined
  return { ...schema, type: 'object', properties, definitions }
}

function cleanDefinitions (definitions: Record<string, unknown>): Record<string, Definition> {
  const result: Record<string, Definition> = {}
  Object.entries(definitions).forEach(([oldName, oldDefinition]) => {
    const cleaned = cleanDefinition(oldDefinition as Record<string, unknown>, oldName)
    Object.entries(cleaned).forEach(([newName, newDefinition]) => {
      result[newName] = newDefinition
    })
  })
  return result
}

function cleanDefinition (definition: Record<string, unknown>, name: string): Record<string, Definition> {
  if ('oneOf' in definition) {
    const cleaned = cleanOneOf(definition, name)
    const result: Definition = { ...definition, type: 'object', oneOf: cleaned.result }
    return { [name]: result, ...cleanDefinitions(cleaned.definitions) }
  } else if ('properties' in definition) {
    const cleaned = cleanProperties(definition, name)
    const result: Definition = { ...definition, type: 'object', properties: cleaned.result }
    return { [name]: result, ...cleanDefinitions(cleaned.definitions) }
  } else {
    return { [name]: definition as unknown as Definition }
  }
}

function cleanOneOf (parent: unknown, name: string): { result: Property[], definitions: Record<string, unknown> } {
  const result: Property[] = []
  const definitions: Record<string, unknown> = {}
  const oneOfs = (parent as any).oneOf as Array<Record<string, unknown>>
  oneOfs.forEach((oneOf, index) => {
    if ('$ref' in oneOf) {
      result.push({ type: 'object', ...oneOf })
    } else {
      const definitionName = `OneOf${name}${index}`
      result.push({ type: 'object', $ref: `#/definitions/${definitionName}` })
      definitions[definitionName] = oneOf
    }
  })
  return ({ result, definitions })
}

function cleanProperties (parent: unknown, name: string): { result: Record<string, Property>, definitions: Record<string, unknown> } {
  const result: Record<string, Property> = {}
  const definitions: Record<string, unknown> = {}
  const properties = (parent as any).properties as Record<string, unknown>
  Object.entries(properties).forEach(([propertyName, property]) => {
    const cleaned = cleanProperty(property, name + capitalize(propertyName))
    result[propertyName] = cleaned.result
    Object.entries(cleaned.definitions).forEach(([defName, definition]) => {
      definitions[defName] = definition
    })
  })
  return ({ result, definitions })
}

function cleanProperty (propertyIn: unknown, name: string): { result: Property, definitions: Record<string, unknown> } {
  const property = propertyIn as { type: string }
  if (property.type === 'array' && 'items' in property) {
    const cleanItem = cleanProperty(property.items, name)
    const result: ArrayProperty = { ...property, type: 'array', items: cleanItem.result }
    return { result, definitions: cleanItem.definitions }
  }
  if ('properties' in property || 'oneOf' in property) {
    const result: ObjectProperty = { type: 'object', $ref: `#/definitions/${name}` }
    return { result, definitions: { [name]: property } }
  }
  const result = property as Property
  return ({ result, definitions: {} })
}
