import { type ImplementationError } from '../../reader/Reader'

/**
 * Compare two JSON-Schemas and return an list of errors
 * NOTE: All references must already be dereferenced, definitions etc. are not supported
 * NOTE: Only the interesting parts are compared, e.g. properties, enums, types NOT the full schema
 * TODO: Add support for REQUIRED
 * @param source The source schea
 * @param dest The destination schema
 * @param path The current property path or undefined to start at the root
 * @returns The list of errors
 */
export function jsonSchemaDiff (source: Schema, dest: Schema, path?: string): ImplementationError[] {
  const results: ImplementationError[] = []

  // Compare type
  if (source.type !== dest.type) {
    const entity = path === undefined ? 'Type' : `Type of '${path}'`
    results.push({ text: `${entity} must be '${source.type}' but is '${dest.type}'`, type: 'WRONG' })
  }

  // Compare enums
  if (source.enum !== undefined || dest.enum !== undefined) {
    const sourceEnum = source.enum ?? []
    const destEnum = dest.enum ?? []
    const entity = path === undefined ? 'Enum' : `Enum '${path}'`
    sourceEnum.forEach(value => {
      if (!(destEnum.includes(value))) results.push({ text: `${entity} must contain value ${JSON.stringify(value)}`, type: 'MISSING_IN_IMPLEMENTATION' })
    })
    destEnum.forEach(value => {
      if (!(sourceEnum.includes(value))) results.push({ text: `${entity} must not contain value ${JSON.stringify(value)}`, type: 'NOT_IN_DOMAIN_MODEL' })
    })
  }

  // Compare arrays
  if (source.items !== undefined || dest.items !== undefined) {
    const sourceItems = source.items ?? {}
    const destItems = dest.items ?? {}
    results.push(...jsonSchemaDiff(sourceItems, destItems, path === undefined ? undefined : path + '[]'))
  }

  // Compare properties
  if (source.properties !== undefined || dest.properties !== undefined) {
    const sourceProperties = source.properties ?? {}
    const destProperties = dest.properties ?? {}
    Object.entries(sourceProperties).forEach(([name, sourceProperty]) => {
      const subPath = path === undefined ? name : `${path}.${name}`
      if (!(name in destProperties)) results.push({ text: `Property '${subPath}' must exist`, type: 'MISSING_IN_IMPLEMENTATION' })
      else results.push(...jsonSchemaDiff(sourceProperty, destProperties[name], `${subPath}`))
    })
    Object.entries(destProperties).forEach(([name]) => {
      const subPath = path === undefined ? name : `${path}.${name}`
      if (!(name in sourceProperties)) results.push({ text: `Property '${subPath}' must not exist`, type: 'NOT_IN_DOMAIN_MODEL' })
    })
  }

  // Compare oneOf
  if (source.oneOf === undefined && dest.oneOf !== undefined) {
    const entity = path === undefined ? 'Type' : `'${path}'`
    results.push({ text: `${entity} must not be OneOf`, type: 'WRONG' })
  }
  if (source.oneOf !== undefined && dest.oneOf === undefined) {
    const entity = path === undefined ? 'Type' : `'${path}'`
    results.push({ text: `${entity} must be OneOf`, type: 'WRONG' })
  }
  if (source.oneOf !== undefined && dest.oneOf !== undefined) {
    const sourceOneOf = source.oneOf ?? []
    const destOneOf = dest.oneOf ?? []
    if (sourceOneOf.length !== destOneOf.length) {
      const entity = path === undefined ? 'Type' : `'${path}'`
      results.push({ text: `${entity} must have ${sourceOneOf.length} instead of ${destOneOf.length} OneOf options`, type: 'WRONG' })
    } else {
      for (let i = 1; i < sourceOneOf.length; i++) {
        results.push(...jsonSchemaDiff(sourceOneOf[i], destOneOf[i], `OneOf[${i}]`))
      }
    }
  }
  return results
}

export interface Schema {
  type?: string
  properties?: Record<string, Schema>
  items?: Schema
  enum?: unknown[]
  oneOf?: Schema[]
}
