import path from 'path'
import { type Schema } from '../../reader/Reader'
import { cleanName, getModuleId } from '../../reader/helper/InputHelper'
import { type JavaPluginOptions } from './JavaPlugin'
import { type PropertyType } from '../../reader/helper/GetType'

// TODO: Document

export function getJavaPropertyType (propertyType: PropertyType, schema: Schema, options: JavaPluginOptions): { name: string, imports: string[] } {
  switch (propertyType.type) {
    case 'reference': return { name: getSimpleJavaClassName(propertyType.$id), imports: [getFullJavaClassName(propertyType.$id, options)] }
    case 'self': return { name: getSimpleJavaClassName(schema.$id), imports: [getFullJavaClassName(schema.$id, options)] }
    case 'definition': return { name: getSimpleJavaClassName(schema.$id, propertyType.name), imports: [getFullJavaClassName(schema.$id, options, propertyType.name)] }
    case 'local':
      if (!(propertyType.name in options.basicTypeMap)) throw new Error(`Unknown basic type: ${propertyType.name}`)
      // eslint-disable-next-line no-case-declarations
      const mappedType = options.basicTypeMap[propertyType.name]
      if (mappedType === undefined) throw new Error(`Unknown basic type: ${propertyType.name}`)
      if (!mappedType.includes('.')) return { name: mappedType, imports: [] }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return { name: mappedType.split('.').pop()!, imports: [mappedType] }
    case 'array':
      // eslint-disable-next-line no-case-declarations
      const innerType = getJavaPropertyType(propertyType.array, schema, options)
      return { name: `Collection<${innerType.name}>`, imports: ['java.util.Collection', ...innerType.imports] }
  }
}

export function getJavaPackageName (schemaOrSchemaId: Schema | string, options: JavaPluginOptions): string {
  let packageName = getModuleId(schemaOrSchemaId).split('/').map(s => cleanName(s)).filter(x => x.length > 0).join('.')
  if (options.mainPackageName !== undefined) packageName = options.mainPackageName + '.' + packageName
  if (options.modelPackageName !== undefined) packageName = packageName + '.' + options.modelPackageName
  return packageName.toLowerCase()
}

export function getFullJavaClassName (schemaOrSchemaId: Schema | string, options: JavaPluginOptions, definitionName?: string): string {
  return getJavaPackageName(schemaOrSchemaId, options) + '.' + getSimpleJavaClassName(schemaOrSchemaId, definitionName)
}

export function getSimpleJavaClassName (schemaOrSchemaId: Schema | string, definitionName?: string): string {
  const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
  const cleanedSchemaId = cleanName(path.basename(schemaId).replace(path.extname(schemaId), ''))
  return definitionName === undefined ? cleanedSchemaId : cleanedSchemaId + cleanName(definitionName)
}
