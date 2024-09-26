import { type OpenAPIV3 } from 'openapi-types'

type Schema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined

/**
 * Compare two JSON-Schemas and return an list of errors
 * NOTE: All references must already be dereferenced, definitions etc. are not supported
 * NOTE: Only the interesting parts are compared, e.g. properties, enums, types NOT the full schema
 * @param expected The source schea
 * @param implemented The destination schema
 * @param path The current property path or undefined to start at the root
 * @returns The list of errors
 */
export function jsonSchemaDiff(expected: Schema, implemented: Schema, path?: string): string[] {
  const entity = path === undefined ? 'Type' : `Type of '${path}'`
  if (expected === undefined && implemented === undefined) return []
  if (expected === undefined) return [`${entity} must not be defined`]
  if (implemented === undefined) return [`${entity} must be defined`]
  if ('$ref' in expected && '$ref' in implemented) return compareRefs(expected, implemented)
  if ('$ref' in expected) return [`${entity} must be a reference`]
  if ('$ref' in implemented) return [`${entity} must not be a reference`]

  return [
    ...compareType(expected, implemented, path),
    ...compareEnum(expected, implemented, path),
    ...compareArray(expected, implemented, path),
    ...compareProperties(expected, implemented, path),
    ...compareOneOf(expected, implemented, path),
    ...compareRequired(expected, implemented, path),
  ]
}

function compareRefs(expected: OpenAPIV3.ReferenceObject, implemented: OpenAPIV3.ReferenceObject, path?: string): string[] {
  if (expected.$ref === implemented.$ref) {
    return []
  }
  const entity = path === undefined ? 'Reference' : `Reference of '${path}'`
  return [`${entity} must be '${expected.$ref}' but is '${implemented.$ref}'`]
}

function compareType(expected: OpenAPIV3.SchemaObject, implemented: OpenAPIV3.SchemaObject, path?: string): string[] {
  if (expected.type === implemented.type) {
    return []
  }
  const entity = path === undefined ? 'Type' : `Type of '${path}'`
  return [`${entity} must be '${expected.type}' but is '${implemented.type}'`]
}

function compareEnum(expected: OpenAPIV3.SchemaObject, implemented: OpenAPIV3.SchemaObject, path?: string): string[] {
  if (expected.enum === undefined && implemented.enum === undefined) {
    return []
  }
  const sourceEnum = expected.enum ?? []
  const destEnum = implemented.enum ?? []
  const entity = path === undefined ? 'Enum' : `Enum '${path}'`
  const results: string[] = []
  sourceEnum.forEach((value) => {
    if (!(destEnum.includes(value))) {
      results.push(`${entity} must contain value ${JSON.stringify(value)}`)
    }
  })
  destEnum.forEach((value) => {
    if (!(sourceEnum.includes(value))) {
      results.push(`${entity} must not contain value ${JSON.stringify(value)}`)
    }
  })
  return results
}

function compareArray(expected: OpenAPIV3.SchemaObject, implemented: OpenAPIV3.SchemaObject, path?: string): string[] {
  if (!('items' in expected || 'items' in implemented)) {
    return []
  }
  const sourceItems = 'items' in expected ? expected.items : {}
  const destItems = 'items' in implemented ? implemented.items : {}
  return jsonSchemaDiff(sourceItems, destItems, path === undefined ? undefined : path + '[]')
}

function compareProperties(expected: OpenAPIV3.SchemaObject, implemented: OpenAPIV3.SchemaObject, path?: string): string[] {
  if (expected.properties === undefined && implemented.properties === undefined) {
    return []
  }
  const results: string[] = []
  const sourceProperties = expected.properties ?? {}
  const destProperties = implemented.properties ?? {}
  Object.entries(sourceProperties).forEach(([name, sourceProperty]) => {
    const subPath = path === undefined ? name : `${path}.${name}`
    if (!(name in destProperties)) {
      results.push(`Property '${subPath}' must exist`)
    } else {
      results.push(...jsonSchemaDiff(sourceProperty, destProperties[name], subPath))
    }
  })
  Object.entries(destProperties).forEach(([name]) => {
    const subPath = path === undefined ? name : `${path}.${name}`
    if (!(name in sourceProperties)) {
      results.push(`Property '${subPath}' must not exist`)
    }
  })
  return results
}

function compareOneOf(expected: OpenAPIV3.SchemaObject, implemented: OpenAPIV3.SchemaObject, path?: string): string[] {
  if (expected.oneOf === undefined && implemented.oneOf !== undefined) {
    const entity = path === undefined ? 'Type' : `'${path}'`
    return [`${entity} must not be OneOf`]
  }
  if (expected.oneOf !== undefined && implemented.oneOf === undefined) {
    const entity = path === undefined ? 'Type' : `'${path}'`
    return [`${entity} must be OneOf`]
  }
  if (expected.oneOf === undefined && implemented.oneOf === undefined) {
    return []
  }

  const sourceOneOf = expected.oneOf ?? []
  const destOneOf = implemented.oneOf ?? []
  const results: string[] = []
  if (sourceOneOf.length !== destOneOf.length) {
    const entity = path === undefined ? 'Type' : `'${path}'`
    results.push(`${entity} must have ${sourceOneOf.length} instead of ${destOneOf.length} OneOf options`)
  } else {
    for (let i = 1; i < sourceOneOf.length; i++) {
      results.push(...jsonSchemaDiff(sourceOneOf[i], destOneOf[i], `OneOf[${i}]`))
    }
  }
  return results
}

function compareRequired(expected: OpenAPIV3.SchemaObject, implemented: OpenAPIV3.SchemaObject, path?: string): string[] {
  if (expected.required === undefined && implemented.required === undefined) {
    return []
  }
  const sourceRequired = expected.required ?? []
  const destRequired = implemented.required ?? []
  const results: string[] = []
  sourceRequired.forEach((value) => {
    const entity = path === undefined ? value : `${path}.${value}`
    if (!(destRequired.includes(value))) {
      results.push(`Property '${entity}' must be required`)
    }
  })
  destRequired.forEach((value) => {
    const entity = path === undefined ? value : `${path}.${value}`
    if (!(sourceRequired.includes(value))) {
      results.push(`Property '${entity}' must not be required`)
    }
  })
  return results
}
