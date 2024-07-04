import { type Module, type Schema, type Model } from '../reader/Reader'
import {
  getModuleForSchema,
  getModuleId,
  getSchemasForModule,
  relativeLink
} from '../reader/helper/InputHelper'
import { type Dependency, type DependencyType, getDependencies } from '../reader/helper/GetDependencies'

/**
 * Generate a dependency diagram for the whole application
 * @param model The model to generate the diagram for
 * @returns The diagram for the whole application as mermaid code
 */
export function applicationDiagram (model: Model): string {
  const dependencies = model.schemas
    .flatMap(s => getDependencies(model, s))
    // Only interested in dependencies over module boundaries
    .filter(d => getModuleId(d.fromSchema) !== getModuleId(d.toSchema))
    // IS_IMPLEMENTED_BY is a special case, because it is a dependency from the parent to the child. Therefore, reverse the direction
    .map(d => d.type === 'IS_IMPLEMENTED_BY' ? { from: d.toSchema, to: d.fromSchema } : { from: d.fromSchema, to: d.toSchema })
    .map(d => ({ fromId: safeId(getModuleId(d.from)), toId: safeId(getModuleId(d.to)) }))
  const lines = [
    'classDiagram',
    ...model.modules.map(m => `class ${safeId(m)}["${m.title}"]`),
    ...unique(dependencies.map(d => `${d.fromId} ..> ${d.toId}`)),
    ...model.modules.map(m => `click ${safeId(m)} href ".${m.$id}/index.html" "${m.title}"`)
  ]
  return lines.join('\n')
}

/**
 * Get a dependency diagram for a single module
 * @param model The model to generate the diagram for
 * @param module The module to generate the diagram for
 * @returns The diagram for the module as mermaid code
 */
export function moduleDiagram (model: Model, module: Module): string {
  const dependenciesTo = model.schemas
    .filter(s => getModuleId(s) !== module.$id)
    .flatMap(s => getDependencies(model, s))
    .filter(d => getModuleId(d.toSchema) === module.$id)
  const dependenciesFrom = getSchemasForModule(model, module)
    .flatMap(s => getDependencies(model, s))
  const dependencies = [...dependenciesTo, ...dependenciesFrom]
  const endpoints = [...getEndpointsFromSchemas(getSchemasForModule(model, module)), ...getEndpointsFromDependencies(dependencies)]
  return toDiagram(dependencies, endpoints, model, module.$id)
}

/**
 * Get a dependency diagram for a single schema
 * @param model The model to generate the diagram for
 * @param schema The schema to generate the diagram for
 * @returns The diagram for the schema as mermaid code
 */
export function schemaDiagramm (model: Model, schema: Schema): string {
  const dependenciesTo = model.schemas
    .filter(s => s !== schema)
    .flatMap(s => getDependencies(model, s))
    .filter(s => s.toSchema === schema)
  const dependenciesFrom = getDependencies(model, schema)
  const dependencies = [...dependenciesTo, ...dependenciesFrom]
  const endpoints = [...getEndpointsFromSchemas([schema]), ...getEndpointsFromDependencies(dependencies)]
  return toDiagram(dependencies, endpoints, model, getModuleId(schema))
}

interface Endpoint { schema: Schema, name?: string }

function getEndpointsFromDependencies (dependencies: Dependency[]): Endpoint[] {
  return dependencies.flatMap(d => [
    { schema: d.fromSchema, name: d.fromDefinitionName },
    { schema: d.toSchema, name: d.toDefinitionName }]
  )
}

function getEndpointsFromSchemas (schemas: Schema[]): Endpoint[] {
  return schemas.flatMap(s => [
    { schema: s },
    ...Object.keys(s.definitions).map(n => ({ schema: s, name: n }))
  ])
}

function safeId (obj: string | Schema | Module): string {
  const id = typeof obj === 'string' ? obj : obj.$id
  return id.replace(/\//g, '_').replace(/\./g, '_')
}

function toDiagram (dependencies: Dependency[], endpoints: Endpoint[], model: Model, moduleId: string): string {
  const modules = unique(endpoints.map(s => getModuleForSchema(model, s.schema)))
  const namespaceStrs = modules.map(module => {
    const endpointsForModule = endpoints.filter(e => getModuleId(e.schema) === module.$id)
    const classesStr = endpointsForModule.map(e => {
      if (e.name !== undefined) {
        return `  class ${e.name}["${e.name}"]`
      } else {
        return `  class ${safeId(e.schema)}["${e.schema.title}"]`
      }
    })
    return `namespace ${module.title} {\n${unique(classesStr).join('\n')}\n}`
  })
  const dependenciesStr = dependencies.flatMap(d => {
    const from = d.fromDefinitionName ?? safeId(d.fromSchema)
    const to = d.toDefinitionName ?? safeId(d.toSchema)
    const arrow = toMermaidType(d.type)
    if (arrow === undefined) return []
    return [`${from} ${toMermaidType(d.type)}${d.array ? '" N"' : ''} ${to} ${d.dependencyName !== undefined ? ':' + d.dependencyName : ''}`]
  })
  const links = unique(endpoints.map((e: Endpoint) => {
    if (e.name === undefined) {
      return `click ${safeId(e.schema)} href "${relativeLink(moduleId, e.schema.$id)}.html" "${e.schema.title}"`
    } else {
      return `click ${e.name} href "${relativeLink(moduleId, e.schema.$id)}.html" "${e.schema.title}"`
    }
  }))
  const lines = ['classDiagram', ...namespaceStrs, ...dependenciesStr, ...links]
  return lines.join('\n')
}

function toMermaidType (type: DependencyType): string | undefined {
  switch (type) {
    case 'IS_IMPLEMENTED_BY': return '<|--'
    case 'CONTAINS': return 'o--'
    case 'REFERENCES': return '..>'
    case 'ENUM': return undefined
  }
}
function unique<T> (arr: T[]): T[] {
  return Array.from(new Set(arr))
}
