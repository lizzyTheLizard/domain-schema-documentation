import { type Module, type Schema, type Model } from '../reader/Reader.ts'
import {
  getModuleForSchema,
  getModuleId,
  getSchemasForModule,
  relativeLink
} from '../reader/helper/InputHelper.ts'
import { type Dependency, type DependencyType, getDependencies } from '../reader/helper/GetDependencies.ts'

// TODO: Is it possible to add links to the generated diagrams?

export function applicationDiagram (model: Model): string | undefined {
  const dependencies = model.schemas
    .flatMap(s => getDependencies(model, s))
    .filter(d => getModuleId(d.fromSchema) !== getModuleId(d.toSchema))
    // IS_IMPLEMENTED_BY is a special case, because it is a dependency from the parent to the child. Therefore, reverse the direction
    .map(d => d.type === 'IS_IMPLEMENTED_BY'
      ? `${safeId(getModuleId(d.toSchema))} ..> ${safeId(getModuleId(d.fromSchema))}`
      : `${safeId(getModuleId(d.fromSchema))} ..> ${safeId(getModuleId(d.toSchema))}`)
  const moduleStrs = model.modules.map(m => `class ${safeId(m)}["${m.title}"]`)
  const links = model.modules.map(m => `click ${safeId(m)} href ".${m.$id}/index.html" "${m.title}"`)
  const lines = [...moduleStrs, ...unique(dependencies), ...links]
  return lines.length === 0 ? undefined : lines.join('\n')
}

export function moduleDiagram (model: Model, module: Module): string | undefined {
  const dependenciesTo = model.schemas
    .filter(s => getModuleId(s) !== module.$id)
    .flatMap(s => getDependencies(model, s))
    .filter(d => getModuleId(d.toSchema) === module.$id)
  const dependenciesFrom = getSchemasForModule(model, module)
    .flatMap(s => getDependencies(model, s))
  const dependencies = [...dependenciesTo, ...dependenciesFrom]
  return toDiagram(dependencies, model, module.$id)
}

export function schemaDiagramm (model: Model, schema: Schema): string | undefined {
  const dependenciesTo = model.schemas
    .filter(s => s !== schema)
    .flatMap(s => getDependencies(model, s))
    .filter(s => s.toSchema === schema)
  const dependenciesFrom = getDependencies(model, schema)
  const dependencies = [...dependenciesTo, ...dependenciesFrom]
  return toDiagram(dependencies, model, getModuleId(schema))
}

function safeId (obj: string | Schema | Module): string {
  const id = typeof obj === 'string' ? obj : obj.$id
  return id.replace(/\//g, '_').replace(/\./g, '_')
}

function toDiagram (dependencies: Dependency[], model: Model, moduleId: string): string | undefined {
  const endpoints = dependencies.flatMap(d => [
    { schema: d.fromSchema, name: d.fromDefinitionName },
    { schema: d.toSchema, name: d.toDefinitionName }
  ])
  const modules = unique(endpoints.map(s => getModuleForSchema(model, s.schema)))
  const namespaceStrs = modules.map(module => {
    const endpointsForModule = unique(endpoints.filter(e => getModuleId(e.schema) === module.$id))
    const classesStr = endpointsForModule.map(e => {
      if (e.name !== undefined) {
        return `  class ${e.name}["${e.name}"]`
      } else {
        return `  class ${safeId(e.schema)}["${e.schema.title}"]`
      }
    })
    return `namespace ${module.title} {\n${classesStr.join('\n')}\n}`
  })

  const dependenciesStr = dependencies.map(d => {
    const from = d.fromDefinitionName ?? safeId(d.fromSchema)
    const to = d.toDefinitionName ?? safeId(d.toSchema)
    return `${from} ${toMermaidType(d.type)} ${d.array ? '"N"' : ''} ${to} ${d.dependencyName !== undefined ? ':' + d.dependencyName : ''}\n`
  })
  const links = unique(endpoints.map(e => {
    if (e.name === undefined) {
      return `click ${safeId(e.schema)} href "${relativeLink(moduleId, e.schema.$id)}.html" "${e.schema.title}"`
    } else {
      return `click ${e.name} href "${relativeLink(moduleId, e.schema.$id)}.html" "${e.schema.title}"`
    }
  }))
  const lines = [...namespaceStrs, ...dependenciesStr, ...links]
  return lines.length === 0 ? undefined : lines.join('\n')
}

function toMermaidType (type: DependencyType): string {
  switch (type) {
    case 'IS_IMPLEMENTED_BY': return '<|--'
    case 'CONTAINS': return 'o--'
    case 'REFERENCES': return '..>'
  }
}
function unique<T> (arr: T[]): T[] {
  return Array.from(new Set(arr))
}
