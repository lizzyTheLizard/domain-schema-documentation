import path from 'path'
import { type Model, type Module, type Property, type Schema } from '../../reader/Reader'
import { cleanName, getModuleId } from '../../reader/helper/InputHelper'
import { type JavaPluginOptions } from './JavaPlugin'
import { getType, type PropertyType } from '../../reader/helper/GetType'

export type JavaType = JavaClassType | JavaCollectionType
interface JavaClassType { type: 'CLASS', fullName: string }
interface JavaCollectionType { type: 'COLLECTION', items: JavaType }

/**
 * Gets the Java type for a given property.
 * @param model The model, @see Model
 * @param schema The schema the property is in, @see Schema
 * @param property The property to get the type for, @see Property
 * @param options The Java plugin options, @see JavaPluginOptions
 * @returns The Java type for the property
 */
export function getJavaPropertyType (model: Model, schema: Schema, property: Property, options: JavaPluginOptions): JavaType {
  const propertyType = getType(model, schema, property)
  return getJavaPropertyTypeInternal(propertyType, schema, options)
}

function getJavaPropertyTypeInternal (propertyType: PropertyType, schema: Schema, options: JavaPluginOptions): JavaType {
  switch (propertyType.type) {
    case 'reference': return { type: 'CLASS', fullName: getFullJavaClassName(propertyType.$id, options) }
    case 'self': return { type: 'CLASS', fullName: getFullJavaClassName(schema.$id, options) }
    case 'definition': return { type: 'CLASS', fullName: getFullJavaClassName(schema.$id, options, propertyType.name) }
    case 'local':
      if (!(propertyType.name in options.basicTypeMap)) throw new Error(`Unknown basic type: ${propertyType.name}`)
      return { type: 'CLASS', fullName: options.basicTypeMap[propertyType.name] }
    case 'array':
      return { type: 'COLLECTION', items: getJavaPropertyTypeInternal(propertyType.array, schema, options) }
  }
}

/**
 * Gets the java package name for a given schema.
 * @param schemaOrSchemaId The schema or schema id to get the package name for, @see Schema
 * @param options The Java plugin options, @see JavaPluginOptions
 * @returns The package name of this schema
 */
export function getJavaPackageName (schemaOrSchemaId: Schema | string, options: JavaPluginOptions): string {
  const moduleId = getModuleId(schemaOrSchemaId)
  return getJavaPackageNameForModule(moduleId, options)
}
/**
 * Gets the java package name for a given module.
 * @param moduleOrModuleId The module or module id to get the package name for, @see Module
 * @param options The Java plugin options, @see JavaPluginOptions
 * @returns The package name of this schema
 */
export function getJavaPackageNameForModule (moduleOrModuleId: Module | string, options: JavaPluginOptions): string {
  const moduleId = typeof moduleOrModuleId === 'string' ? moduleOrModuleId : moduleOrModuleId.$id
  let packageName = moduleId.split('/').map(s => cleanName(s)).filter(x => x.length > 0).join('.')
  if (options.mainPackageName !== undefined) packageName = options.mainPackageName + '.' + packageName
  if (options.modelPackageName !== undefined) packageName = packageName + '.' + options.modelPackageName
  return packageName.toLowerCase()
}

/**
 * Gets the full java class name for a given schema.
 * @param schemaOrSchemaId The schema or schema id to get the java class name for, @see Schema
 * @param options The Java plugin options, @see JavaPluginOptions
 * @param definitionName The name of the definition in this schema to generate the class name for or undefined if the schema itself should be used
 * @returns The full java class name for this schema
 */
export function getFullJavaClassName (schemaOrSchemaId: Schema | string, options: JavaPluginOptions, definitionName?: string): string {
  return getJavaPackageName(schemaOrSchemaId, options) + '.' + getSimpleJavaClassName(schemaOrSchemaId, definitionName)
}

/**
 * Gets the simple java class name for a given schema.
 * @param schemaOrSchemaId The schema or schema id to get the java class name for, @see Schema
 * @param definitionName The name of the definition in this schema to generate the class name for or undefined if the schema itself should be used
 * @returns The simple java class name for this schema
 */
export function getSimpleJavaClassName (schemaOrSchemaId: Schema | string, definitionName?: string): string {
  const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
  const cleanedSchemaId = cleanName(path.basename(schemaId).replace(path.extname(schemaId), ''))
  return definitionName === undefined ? cleanedSchemaId : cleanedSchemaId + cleanName(definitionName)
}
