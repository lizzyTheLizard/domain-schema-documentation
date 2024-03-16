import { type Input } from './Input.ts'
import { type Property, type Schema } from './Schema.ts'
import path from 'path'

export type PropertyType = PropertyReferenceType | PropertyLocalType | PropertyArrayType
type PropertyReferenceType = { type: 'self', name: string } | { type: 'definition', name: string } | { type: 'reference', name: string, $id: string }
interface PropertyLocalType { type: 'local', name: string, references?: PropertyReferenceType[] }
interface PropertyArrayType { type: 'array', array: PropertyType }

export function getType (input: Input, schema: Schema, property: Property): PropertyType {
  if (property.type === 'array') return { type: 'array', array: getType(input, schema, property.items) }
  if ('$ref' in property && property.$ref !== undefined) return getReferenceType(input, schema, property.$ref)

  let localType = (('format' in property) ? property.format : property.type)
  if (localType === undefined) {
    console.error(`Invalid property in ${schema.$id}, cannot determine type`)
    localType = 'MISSING TYPE'
  }
  const result: PropertyLocalType = { type: 'local', name: localType }
  if ('x-references' in property) {
    const array = (typeof property['x-references'] === 'string') ? [property['x-references']] : property['x-references'] ?? []
    return { ...result, references: array.map(r => getReferenceType(input, schema, r)) }
  }
  return result
}

function getReferenceType (input: Input, schema: Schema, reference: string): PropertyReferenceType {
  if (!reference.startsWith('#')) {
    const absolutId = path.join(path.dirname(schema.$id), reference)
    const otherSchema = input.schemas.find(s => s.$id === absolutId)
    if (!otherSchema) {
      console.error(`Invalid reference '${reference}' in ${schema.$id} (${absolutId}), cannot determine type`)
    }
    return { type: 'reference', $id: absolutId, name: otherSchema?.title ?? 'MISSING SCHEMA' }
  }
  if (reference === '#') {
    return { type: 'self', name: schema.title }
  }
  if (reference.startsWith('#/definitions/')) {
    const name = reference.substring('#/definitions/'.length)
    return { type: 'definition', name }
  }
  console.error(`Invalid reference '${reference}' in ${schema.$id}, cannot determine type`)
  return { type: 'definition', name: 'INVALID' }
}
