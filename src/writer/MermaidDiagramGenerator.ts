import { type Input, type Module } from '../reader/input/Input.ts'
import {
  getModuleForSchema,
  getModuleId,
  getSchema,
  getSchemasForModule
} from '../reader/input/InputHelper.ts'
import { type Definition, type Property, type Schema } from '../reader/input/Schema.ts'
import path from 'path'

export function applicationDiagram (input: Input): string {
  const dependencies = input.schemas.flatMap(s => getSchemaDependencies(s))
    .filter(d => safeId(getModuleId(d.from.schemaId)) !== safeId(getModuleId(d.to.schemaId)))
    .map(d => `${safeId(getModuleId(d.from.schemaId))} ..> ${safeId(getModuleId(d.to.schemaId))}`)
  const uniqueDependencies = [...new Set(dependencies)]
  return `classDiagram
  ${input.modules.map(m => `class ${safeId(m)}["${m.title}"]`).join('\n  ')}
  ${uniqueDependencies.join('\n')}
  `
}

export function moduleDiagram (input: Input, module: Module): string {
  const dependenciesTo = input.schemas
    .filter(s => isRelevantForModuleDiagram(s))
    .filter(s => getModuleId(s) !== module.$id)
    .flatMap(s => getSchemaDependencies(s))
    .filter(d => isRelevantForModuleDiagram(input.schemas.find(s => s.$id === d.to.schemaId)))
    .filter(d => getModuleId(d.to.schemaId) === module.$id)
  const dependenciesFrom = getSchemasForModule(input, module)
    .filter(s => isRelevantForModuleDiagram(s))
    .flatMap(s => getSchemaDependencies(s))
    .filter(d => isRelevantForModuleDiagram(input.schemas.find(s => s.$id === d.to.schemaId)))
  const dependencies = [...dependenciesTo, ...dependenciesFrom]
  return toDiagram(dependencies, input)
}

export function schemaDiagramm (input: Input, schema: Schema): string {
  const dependenciesTo = input.schemas
    .filter(s => s !== schema)
    .flatMap(s => getSchemaDependencies(s))
    .filter(s => s.to.schemaId === schema.$id)
  const dependenciesFrom = getSchemaDependencies(schema)
  const dependencies = [...dependenciesTo, ...dependenciesFrom]
  return toDiagram(dependencies, input)
}

function safeId (obj: string | Schema | Module): string {
  const id = typeof obj === 'string' ? obj : obj.$id
  return id.replace(/\//g, '_').replace(/\./g, '_')
}

function isRelevantForModuleDiagram (schema?: Schema): boolean {
  if (!schema) return false
  return schema['x-schema-type'] !== 'ReferenceData' && schema['x-schema-type'] !== 'ValueObject'
}

function getSchemaDependencies (s: Schema): Dependency[] {
  return [
    ...getDefinitionDependencies(s, s),
    ...Object.entries(s.definitions).flatMap(([name, d]) => getDefinitionDependencies(s, d, name))
  ]
}

function getDefinitionDependencies (s: Schema, d: Definition | Property, name?: string): Dependency[] {
  if ('oneOf' in d) {
    return d.oneOf.map(oneOf => ({ from: { schemaId: s.$id, name }, to: getTo(s, oneOf.$ref), type: '<|..' }))
  }
  if ('properties' in d) {
    return Object.values(d.properties).flatMap<Dependency>(p => {
      if ('$ref' in p) return [{ from: { schemaId: s.$id, name }, to: getTo(s, p.$ref), type: 'o--' }]
      if ('x-references' in p) {
        const references = (typeof p['x-references'] === 'string') ? [p['x-references']] : p['x-references'] ?? []
        return references.map(r => ({ from: { schemaId: s.$id, name }, to: getTo(s, r), type: '..>' }))
      }
      if ('items' in p && '$ref' in p.items) {
        return [{ from: { schemaId: s.$id, name }, to: getTo(s, p.items.$ref), type: 'o--' }]
      }
      if ('items' in p && 'x-references' in p.items) {
        const references = (typeof p.items['x-references'] === 'string') ? [p.items['x-references']] : p.items['x-references'] ?? []
        return references.map(r => ({ from: { schemaId: s.$id, name }, to: getTo(s, r), type: '..>' }))
      }
      return []
    })
  }
  return []
}

function getTo (schema: Schema, refOrReference: string): { schemaId: string, name?: string } {
  if (refOrReference === '#') {
    return { schemaId: schema.$id }
  }
  if (refOrReference.startsWith('#')) {
    return { schemaId: schema.$id, name: refOrReference.substring('#/definitions/'.length) }
  }
  const otherId = path.join(path.dirname(schema.$id), refOrReference)
  return { schemaId: otherId }
}

function toDiagram (dependencies: Dependency[], input: Input): string {
  const endpoints = dependencies.flatMap(d => [d.from, d.to])
  const namespaceStrs = endpoints
    .map(e => getModuleForSchema(input, e.schemaId))
    .map(module => {
      const endpointsForModule = endpoints.filter(e => getModuleId(e.schemaId) === module.$id)
      const filteredEndpoints = unique(endpointsForModule)
      const classesStr = filteredEndpoints.map(e => {
        if (e.name !== undefined) {
          return `  class ${e.name}["${e.name}"]`
        } else {
          const schema = getSchema(input, e.schemaId)
          return `  class ${safeId(schema)}["${schema.title}"]`
        }
      })
      return `namespace ${module.title} {\n${classesStr.join('\n')}\n}`
    })

  const dependenciesStr = dependencies.map(d => {
    const from = d.from.name ?? safeId(d.from.schemaId)
    const to = d.to.name ?? safeId(d.to.schemaId)
    return `${from} ${d.type} ${to}\n`
  })

  return `classDiagram
  ${namespaceStrs.join('\n')}
  ${dependenciesStr.join('\n')}`
}

function unique<T> (input: T[]): T[] {
  return Array.from(new Set(input))
}

interface Dependency {
  from: Endpoint
  to: Endpoint
  type: '<|..' | '-->' | '..>' | 'o--'
}

interface Endpoint { schemaId: string, name?: string }
