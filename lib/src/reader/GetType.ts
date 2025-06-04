import { type Property } from '../schemaNormalizer/NormalizedSchema'
import { type Schema, type Model, type PropertyExtension } from './Reader'
import { resolveRelativeId } from './InputHelper'

export type PropertyType = PropertyReferenceType | PropertyLocalType | PropertyArrayType | PropertyMapType
export type PropertyReferenceType = { type: 'self', name: string } | { type: 'definition', name: string } | { type: 'reference', name: string, $id: string }
export interface PropertyLocalType { type: 'local', name: string, references?: PropertyReferenceType[] }
export interface PropertyArrayType { type: 'array', array: PropertyType }
export interface PropertyMapType { type: 'map', items: PropertyType }

/**
 * Get the type of a property
 * @param model The model where the property is defined
 * @param schema The schema where the property is defined
 * @param property The property to get the type for
 * @returns The type of the property
 */
export function getType(model: Model, schema: Schema, property: Property & PropertyExtension): PropertyType {
  if ('type' in property && property.type === 'array') return { type: 'array', array: getType(model, schema, property.items) }
  if ('$ref' in property) return getReferenceType(model, schema, property.$ref)
  if ('additionalProperties' in property) {
    if (property.additionalProperties === true) {
      return { type: 'map', items: { type: 'local', name: 'Object' } }
    }
    if (property.additionalProperties !== false) {
      const additionalType: PropertyType = getType(model, schema, property.additionalProperties)
      return { type: 'map', items: additionalType }
    }
  }

  const localType = (('format' in property && property.format !== undefined) ? property.format : (property as { type: string }).type)
  const result: PropertyLocalType = { type: 'local', name: localType }
  if ('x-references' in property) {
    const xref = property['x-references']
    const array = (typeof xref === 'string') ? [xref] : xref ?? []
    return { ...result, references: array.map(r => getReferenceType(model, schema, r)) }
  }
  return result
}

function getReferenceType(model: Model, schema: Schema, reference: string): PropertyReferenceType {
  if (!reference.startsWith('#')) {
    const absoluteId = resolveRelativeId(schema, reference)
    const otherSchema = model.schemas.find(s => s.$id === absoluteId)
    if (!otherSchema) {
      throw new Error(`Invalid reference '${reference}' in ${schema.$id}, cannot determine type`)
    }
    return { type: 'reference', $id: absoluteId, name: otherSchema.title }
  }
  if (reference === '#') {
    return { type: 'self', name: schema.title }
  }
  if (reference.startsWith('#/definitions/')) {
    const name = reference.substring('#/definitions/'.length)
    return { type: 'definition', name }
  }
  throw new Error(`Invalid reference '${reference}' in ${schema.$id}, cannot determine type`)
}
