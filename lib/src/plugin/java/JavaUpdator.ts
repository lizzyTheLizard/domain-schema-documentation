import { type Link, type Module, type Schema, type Model } from '../../reader/Model'
import { type Updator } from '../Plugin'
import { getSimpleJavaClassName } from './JavaHelper'

export function javaUpdator (): Updator {
  return async (model: Model) => ({
    application: model.application,
    modules: model.modules.map(m => ({ ...m, links: getModuleLinks(m) })),
    schemas: model.schemas.map(s => ({ ...s, 'x-links': getSchemaLinks(s) }))
  })
}

function getModuleLinks (m: Module): Link[] {
  return [...m.links ?? [], { text: 'Java-Files', href: './java' }]
}

function getSchemaLinks (s: Schema): Link[] {
  const mainLink = { text: 'Java-File', href: './java/' + getSimpleJavaClassName(s) + '.java' }
  const definitionLinks = Object.entries(s.definitions).map(([n, d]) => ({ text: 'Java-File (' + n + ')', href: './java/' + getSimpleJavaClassName(s, n) + '.java' }))
  return [...s['x-links'] ?? [], mainLink, ...definitionLinks]
}
