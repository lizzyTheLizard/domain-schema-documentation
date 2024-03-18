import { type Definition, type Property, type Schema, type Model } from '../Reader.ts'
import { getSchema, resolveRelativeId } from './InputHelper.ts'

export interface Dependency {
  fromSchema: Schema
  fromDefinitionName?: string
  toSchema: Schema
  toDefinitionName?: string
  type: DependencyType
  dependencyName?: string
  array: boolean
}

export type DependencyType = 'IS_IMPLEMENTED_BY' | 'CONTAINS' | 'REFERENCES'

export function getDependencies (model: Model, s: Schema): Dependency[] {
  const schemaDependencies = getDependenciesForDefinition(model, s)
  const definitionDependencies = Object.keys(s.definitions).flatMap(name => getDependenciesForDefinition(model, s, name))
  return Array.from(new Set([...schemaDependencies, ...definitionDependencies]))
}

function getDependenciesForDefinition (model: Model, s: Schema, fromDefinitionName?: string): Dependency[] {
  const d: Definition = fromDefinitionName !== undefined ? s.definitions[fromDefinitionName] : s
  if ('oneOf' in d) {
    return d.oneOf
      .flatMap(oneOf => getDependenciesForProperty(model, s, oneOf, fromDefinitionName))
      .map(d => ({ ...d, type: 'IS_IMPLEMENTED_BY' }))
  }
  if ('properties' in d) {
    return Object.entries(d.properties)
      .flatMap(([name, p]) => getDependenciesForProperty(model, s, p, fromDefinitionName)
        .map(d => ({ ...d, dependencyName: name })))
  }
  return []
}

function getDependenciesForProperty (model: Model, fromSchema: Schema, p: Property, fromDefinitionName?: string): Dependency[] {
  if ('items' in p) {
    return getDependenciesForProperty(model, fromSchema, p.items, fromDefinitionName).map(d => ({ ...d, array: true }))
  }
  if ('x-references' in p) {
    const references = (typeof p['x-references'] === 'string') ? [p['x-references']] : p['x-references'] ?? []
    return references.map(r => {
      const { toSchema, toDefinitionName } = getTo(model, fromSchema, r)
      return { toSchema, fromSchema, toDefinitionName, fromDefinitionName, type: 'REFERENCES', array: false }
    })
  }
  if ('$ref' in p) {
    const { toSchema, toDefinitionName } = getTo(model, fromSchema, p.$ref)
    const toDefinition: Definition = toDefinitionName !== undefined ? toSchema.definitions[toDefinitionName] : toSchema
    // If this is a dependency to an enum, this is not a real reference and we skip it
    if ('enum' in toDefinition) {
      return []
    }
    const type = getDependencyType(fromSchema, toSchema)
    return [{ toSchema, fromSchema, toDefinitionName, fromDefinitionName, type, array: false }]
  }
  return []
}

function getTo (model: Model, schema: Schema, refOrReference: string): { toSchema: Schema, toDefinitionName?: string } {
  if (refOrReference === '#') {
    return { toSchema: schema }
  }
  if (refOrReference.startsWith('#')) {
    return { toSchema: schema, toDefinitionName: refOrReference.substring('#/definitions/'.length) }
  }

  const otherId = resolveRelativeId(schema, refOrReference)
  const toSchema = getSchema(model, otherId)
  return { toSchema }
}

function getDependencyType (fromSchema: Schema, toSchema: Schema): DependencyType {
  // If this is within the same schema, the type does not matter and it is contains
  if (fromSchema === toSchema) {
    return 'CONTAINS'
  }

  const fromType = fromSchema['x-schema-type']
  const toType = toSchema['x-schema-type']

  // If type is other, we can't know and default is REFERENCES
  if (fromType === 'Other' || toType === 'Other') return 'REFERENCES'

  switch (toType) {
    case 'Aggregate':
      console.error(`Aggregate ${toSchema.$id} is included in ${fromSchema.$id} using $ref. This is unusual, normally you want to reference another aggreate using x-references`)
      return 'REFERENCES'
    case 'ReferenceData':
      console.error(`ReferenceData ${toSchema.$id} is included in ${fromSchema.$id} using $ref. This is unusual, normally you want to reference reference data using x-references`)
      return 'REFERENCES'
    case 'ValueObject':
      return 'CONTAINS'
    case 'Entity':
      if (fromType === 'ValueObject' || fromType === 'ReferenceData') {
        console.error(`Entity ${toSchema.$id} is included in ${fromSchema.$id} using $ref. This is unusual, normally you want to reference entitites using x-references`)
        return 'REFERENCES'
      }
      return 'CONTAINS'
  }
}
