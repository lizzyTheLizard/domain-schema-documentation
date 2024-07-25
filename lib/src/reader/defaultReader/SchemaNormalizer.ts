import {
  type ArrayProperty,
  type BasicProperty,
  type Definition,
  type EnumDefinition,
  type InterfaceDefinition,
  type ObjectDefinition,
  type RefProperty,
  type Property,
  type Schema
} from '../Reader'
import { cleanName } from '../helper/InputHelper'
import { type NonNormalizedSubSchema, type NonNormalizedSchema } from './InputValidator'
import { InputNormalizer } from './InputNormalizer'

/**
 * Normalizes a single schema, see {@link InputNormalizer} for details
 * @param schema The schema to normalize
 * @returns The normalized schema
 */
export function normalizeSchema (schema: NonNormalizedSchema): Schema {
  const name = cleanName(schema.title)
  const normaliezedDefinition = normalizeDefinition(schema, name)
  const definitions = normalizeDefinitions({ ...normaliezedDefinition.definitions, ...(schema.definitions ?? {}) })
  // Typescript does not know that whenever there is an additionalProperties field in schema,
  // it is in normaliezedDefinition.result as well. delete it to avoid type confusion
  const { additionalProperties: _, ...remainingSchema } = schema
  return {
    ...remainingSchema,
    ...normaliezedDefinition.result,
    'x-links': schema['x-links'] ?? [],
    'x-tags': schema['x-tags'] ?? [],
    'x-errors': schema['x-errors'] ?? [],
    'x-todos': schema['x-todos'] ?? [],
    definitions
  }
}

function normalizeDefinition (definition: NonNormalizedSubSchema, name: string): NormalizerResult<Definition> {
  let definitions: Record<string, NonNormalizedSubSchema> = {}

  if (definition.type === 'string') {
    const enumDefinition: EnumDefinition = {
      ...definition,
      type: 'string',
      enum: definition.enum ?? []
    }
    return { result: enumDefinition, definitions }
  }

  const cleanedProperties = normalizeProperties(definition.properties ?? {})
  definitions = { ...definitions, ...cleanedProperties.definitions }
  const objectDefinition: ObjectDefinition = {
    type: 'object',
    properties: cleanedProperties.result,
    required: definition.required ?? []
  }

  if ('additionalProperties' in definition && definition.additionalProperties !== undefined) {
    const cleanedAdditionalProperties = normalizeAdditionalProperties(definition.additionalProperties)
    definitions = { ...definitions, ...cleanedAdditionalProperties.definitions }
    objectDefinition.additionalProperties = cleanedAdditionalProperties.result
  }

  if (!definition.oneOf) {
    return { result: objectDefinition, definitions }
  }

  const cleanedOneOf = normalizeOneOf(definition.oneOf, name)
  definitions = { ...definitions, ...cleanedOneOf.definitions }
  const interfaceDefinition: InterfaceDefinition = {
    ...objectDefinition,
    oneOf: cleanedOneOf.result
  }
  return { result: interfaceDefinition, definitions }
}

function normalizeOneOf (oneOf: NonNormalizedSubSchema[], name: string): NormalizerResult<RefProperty[]> {
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

function normalizeProperties (properties: Record<string, NonNormalizedSubSchema>): NormalizerResult<Record<string, Property>> {
  const result: Record<string, Property> = {}
  const definitions: Record<string, NonNormalizedSubSchema> = {}
  Object.entries(properties).forEach(([propertyName, property]) => {
    const cleaned = normalizeProperty(property, cleanName(propertyName))
    result[propertyName] = cleaned.result
    Object.entries(cleaned.definitions).forEach(([defName, definition]) => {
      definitions[defName] = definition
    })
  })
  return ({ result, definitions })
}

function normalizeProperty (property: NonNormalizedSubSchema, name: string): NormalizerResult<Property> {
  if (property.$ref !== undefined) {
    const result: RefProperty = { ...property, $ref: property.$ref }
    return { result, definitions: {} }
  }
  if (property.type === 'array' && property.items) {
    const cleanItem = normalizeProperty(property.items, name)
    const result: ArrayProperty = { ...property, type: 'array', items: cleanItem.result }
    return { result, definitions: cleanItem.definitions }
  }
  if (property.properties ?? property.oneOf ?? property.enum) {
    const result: RefProperty = { $ref: `#/definitions/${name}` }
    return { result, definitions: { [name]: property } }
  }
  if (property.type === undefined || (property.type !== 'boolean' && property.type !== 'integer' && property.type !== 'number' && property.type !== 'string')) {
    console.error(`Invalid type ${property.type} for property ${name}. Assuming string`)
    const result: BasicProperty = { ...property, type: 'string' }
    return ({ result, definitions: {} })
  }

  const result: BasicProperty = { ...property, type: property.type }
  return ({ result, definitions: {} })
}

function normalizeAdditionalProperties (additionalProperties: NonNormalizedSubSchema | boolean): NormalizerResult<boolean | Property> {
  if (typeof additionalProperties === 'boolean') {
    return { result: additionalProperties, definitions: {} }
  }
  if (typeof additionalProperties === 'object') {
    const cleaned = normalizeProperty(additionalProperties, 'AdditionalProperties')
    return { result: cleaned.result, definitions: cleaned.definitions }
  }
  throw new Error(`Invalid type ${typeof additionalProperties} for additionalProperties`)
}

function normalizeDefinitions (definitions: Record<string, NonNormalizedSubSchema>): Record<string, Definition> {
  const result: Record<string, Definition> = {}
  Object.entries(definitions).forEach(([oldName, oldDefinition]) => {
    const cleaned = normalizeDefinition(oldDefinition, oldName)
    result[oldName] = cleaned.result
    const normalizedSubDefinitions = normalizeDefinitions(cleaned.definitions)
    Object.entries(normalizedSubDefinitions).forEach(([name, definition]) => { result[name] = definition })
  })
  return result
}

interface NormalizerResult<T> {
  result: T
  definitions: Record<string, NonNormalizedSubSchema>
}
