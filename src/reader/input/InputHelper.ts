import path from 'path'
import { type Input, type Module } from './Input.ts'
import { type Property, type Schema, type SchemaType } from './Schema.ts'

export function getSchemasForModule (input: Input, module: Module): Schema[] {
  return input.schemas.filter(schema => schema.$id.startsWith(module.$id + '/'))
}

export function getSchemasForModuleAndTyp (input: Input, module: Module, typ: SchemaType): Schema[] {
  return getSchemasForModule(input, module).filter(schema => schema['x-schema-type'] === typ)
}

export function getModuleId (schemaOrSchemaId: string | Schema): string {
  const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
  return path.dirname(schemaId)
}

export function getSchema (input: Input, schemaId: string): Schema {
  const schema = input.schemas.find(s => s.$id === schemaId)
  if (!schema) throw new Error(`Schema with id ${schemaId} not found`)
  return schema
}

export function getModuleForSchema (input: Input, schemaOrSchemaId: string | Schema): Module {
  const moduleId = getModuleId(schemaOrSchemaId)
  const module = input.modules.find(m => m.$id === moduleId)
  if (!module) {
    const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
    throw new Error(`Module for schema ${schemaId} not found`)
  }
  return module
}

export function cleanName (s: string): string {
  s = s.replace(/[^a-zA-Z0-9]/g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type PropertyReferenceType = { type: 'self', name: string } | { type: 'definition', name: string } | { type: 'reference', name: string, $id: string }
interface PropertyLocalType { type: 'local', name: string, references?: PropertyReferenceType[] }
interface PropertyArrayType { type: 'array', array: PropertyType }
export type PropertyType = PropertyReferenceType | PropertyLocalType | PropertyArrayType

export function getPropertyType (input: Input, schema: Schema, property: Property): PropertyType {
  if (property.type === 'array') return { type: 'array', array: getPropertyType(input, schema, property.items) }
  if ('$ref' in property && property.$ref !== undefined) return getPropertyReferenceType(input, schema, property.$ref)

  let localType = (('format' in property) ? property.format : property.type)
  if (localType === undefined) {
    console.error(`Invalid property in ${schema.$id}, cannot determine type`)
    localType = 'MISSING TYPE'
  }
  const result: PropertyLocalType = { type: 'local', name: localType }
  if ('x-references' in property) {
    const array = (typeof property['x-references'] === 'string') ? [property['x-references']] : property['x-references'] ?? []
    return { ...result, references: array.map(r => getPropertyReferenceType(input, schema, r)) }
  }
  return result
}

function getPropertyReferenceType (input: Input, schema: Schema, reference: string): PropertyReferenceType {
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
