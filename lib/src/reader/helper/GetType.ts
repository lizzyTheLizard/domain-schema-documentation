import { type Property, type Schema, type BasicProperty, type Model } from '../Model'
import path from 'path'

export type PropertyType = PropertyReferenceType | PropertyLocalType | PropertyArrayType
type PropertyReferenceType = { type: 'self', name: string } | { type: 'definition', name: string } | { type: 'reference', name: string, $id: string }
interface PropertyLocalType { type: 'local', name: string, references?: PropertyReferenceType[] }
interface PropertyArrayType { type: 'array', array: PropertyType }

export function getType (model: Model, schema: Schema, property: Property): PropertyType {
  if ('type' in property && property.type === 'array') return { type: 'array', array: getType(model, schema, property.items) }
  if ('$ref' in property && property.$ref !== undefined) return getReferenceType(model, schema, property.$ref)

  let localType = (('format' in property) ? property.format : (property as BasicProperty).type)
  if (localType === undefined) {
    console.error(`Invalid property in ${schema.$id}, cannot determine type`)
    localType = 'MISSING TYPE'
  }
  const result: PropertyLocalType = { type: 'local', name: localType }
  if ('x-references' in property) {
    const array = (typeof property['x-references'] === 'string') ? [property['x-references']] : property['x-references'] ?? []
    return { ...result, references: array.map(r => getReferenceType(model, schema, r)) }
  }
  return result
}

function getReferenceType (model: Model, schema: Schema, reference: string): PropertyReferenceType {
  if (!reference.startsWith('#')) {
    const absolutId = path.join(path.dirname(schema.$id), reference)
    const otherSchema = model.schemas.find(s => s.$id === absolutId)
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
