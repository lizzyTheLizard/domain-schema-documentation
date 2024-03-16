import { type Definition, type Property, type Schema } from './Schema.ts'
import { type Input } from './Input.ts'
import path from 'path'
import { getSchema } from './InputHelper.ts'

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

export function getDependencies (input: Input, s: Schema): Dependency[] {
  const schemaDependencies = getDependenciesForDefinition(input, s)
  const definitionDependencies = Object.keys(s.definitions).flatMap(name => getDependenciesForDefinition(input, s, name))
  return Array.from(new Set([...schemaDependencies, ...definitionDependencies]))
}

function getDependenciesForDefinition (input: Input, s: Schema, fromDefinitionName?: string): Dependency[] {
  const d: Definition = fromDefinitionName !== undefined ? s.definitions[fromDefinitionName] : s
  if ('oneOf' in d) {
    return d.oneOf
      .flatMap(oneOf => getDependenciesForProperty(input, s, oneOf, fromDefinitionName))
      .map(d => ({ ...d, type: 'IS_IMPLEMENTED_BY' }))
  }
  if ('properties' in d) {
    return Object.entries(d.properties)
      .flatMap(([name, p]) => getDependenciesForProperty(input, s, p, fromDefinitionName)
        .map(d => ({ ...d, dependencyName: name })))
  }
  return []
}

function getDependenciesForProperty (input: Input, fromSchema: Schema, p: Property, fromDefinitionName?: string): Dependency[] {
  if ('items' in p) {
    return getDependenciesForProperty(input, fromSchema, p.items, fromDefinitionName).map(d => ({ ...d, array: true }))
  }
  if ('x-references' in p) {
    const references = (typeof p['x-references'] === 'string') ? [p['x-references']] : p['x-references'] ?? []
    return references.map(r => {
      const { toSchema, toDefinitionName } = getTo(input, fromSchema, r)
      return { toSchema, fromSchema, toDefinitionName, fromDefinitionName, type: 'REFERENCES', array: false }
    })
  }
  if ('$ref' in p) {
    const { toSchema, toDefinitionName } = getTo(input, fromSchema, p.$ref)
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

function getTo (input: Input, schema: Schema, refOrReference: string): { toSchema: Schema, toDefinitionName?: string } {
  if (refOrReference === '#') {
    return { toSchema: schema }
  }
  if (refOrReference.startsWith('#')) {
    return { toSchema: schema, toDefinitionName: refOrReference.substring('#/definitions/'.length) }
  }
  const otherId = path.join(path.dirname(schema.$id), refOrReference)
  const toSchema = getSchema(input, otherId)
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
