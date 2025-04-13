import { type Model, type Module, type Schema } from '../../reader/Reader'
import { cleanName, getModuleId, getSchemaName } from '../../reader/InputHelper'
import { SrcDirDefinition, type JavaPluginOptions } from './JavaPlugin'
import { getType, type PropertyType } from '../../reader/GetType'
import { type Property } from '../../schemaNormalizer/NormalizedSchema'
import { promises as fs } from 'fs'
import path from 'path'

export type JavaType = JavaClassType | JavaCollectionType | JavaMapType
interface JavaClassType { type: 'CLASS', fullName: string }
interface JavaCollectionType { type: 'COLLECTION', items: JavaType }
interface JavaMapType { type: 'MAP', items: JavaType }

/**
 * Gets the Java type for a given property.
 * @param model The model the property is in
 * @param schema The schema the property is in
 * @param property The property to get the type for
 * @param options The Java plugin options
 * @returns The Java type for the property
 */
export function getJavaPropertyType(model: Model, schema: Schema, property: Property, options: JavaPluginOptions): JavaType {
  const propertyType = getType(model, schema, property)
  return getJavaPropertyTypeInternal(propertyType, schema, options)
}

/**
 * Gets the Java type for the additonal properties of a schema.
 * @param model The model the property is in
 * @param schema The schema the property is in
 * @param additionalProperties The addional property value. Note; undefined or false is not allowed here as this function assumes there are additional properties.
 * @param options The Java plugin options
 * @returns The Java type for the property
 */
export function getJavaAdditionalPropertyType(model: Model, schema: Schema, additionalProperties: true | Property, options: JavaPluginOptions): JavaType {
  if (additionalProperties === true) {
    return { type: 'MAP', items: { type: 'CLASS', fullName: 'Object' } }
  }
  const propertyType = getType(model, schema, additionalProperties)
  const internalType = getJavaPropertyTypeInternal(propertyType, schema, options)
  return { type: 'MAP', items: internalType }
}

function getJavaPropertyTypeInternal(propertyType: PropertyType, schema: Schema, options: JavaPluginOptions): JavaType {
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
 * @param schemaOrSchemaId The schema or schema id to get the package name for
 * @param options The Java plugin options
 * @returns The package name of this schema
 */
export function getJavaPackageName(schemaOrSchemaId: Schema | string, options: JavaPluginOptions): string {
  const moduleId = getModuleId(schemaOrSchemaId)
  return getJavaPackageNameForModule(moduleId, options)
}
/**
 * Gets the java package name for a given module.
 * @param moduleOrModuleId The module or module id to get the package name for
 * @param options The Java plugin options
 * @returns The package name of this schema
 */
export function getJavaPackageNameForModule(moduleOrModuleId: Module | string, options: JavaPluginOptions): string {
  const moduleId = typeof moduleOrModuleId === 'string' ? moduleOrModuleId : moduleOrModuleId.$id
  let packageName = moduleId.split('/').map(s => cleanName(s)).filter(x => x.length > 0).join('.')
  if (options.mainPackageName !== undefined) packageName = options.mainPackageName + '.' + packageName
  if (options.modelPackageName !== undefined) packageName = packageName + '.' + options.modelPackageName
  return packageName.toLowerCase()
}

/**
 * Gets the full java class name for a given schema.
 * @param schemaOrSchemaId The schema or schema id to get the java class name for
 * @param options The Java plugin options
 * @param definitionName The name of the definition in this schema to generate the class name for or undefined if the schema itself should be used
 * @returns The full java class name for this schema
 */
export function getFullJavaClassName(schemaOrSchemaId: Schema | string, options: JavaPluginOptions, definitionName?: string): string {
  return getJavaPackageName(schemaOrSchemaId, options) + '.' + getSimpleJavaClassName(schemaOrSchemaId, definitionName)
}

/**
 * Gets the simple java class name for a given schema.
 * @param schemaOrSchemaId The schema or schema id to get the java class name for
 * @param definitionName The name of the definition in this schema to generate the class name for or undefined if the schema itself should be used
 * @returns The simple java class name for this schema
 */
export function getSimpleJavaClassName(schemaOrSchemaId: Schema | string, definitionName?: string): string {
  const cleanedSchemaId = cleanName(getSchemaName(schemaOrSchemaId))
  return definitionName === undefined ? cleanedSchemaId : cleanedSchemaId + cleanName(definitionName)
}

/**
 * Gets the module directory for a given module.
 * @param module The given module
 * @param srcDir The kind of source directory to use.
 * @param options The plugin options
 * @returns The module directory for this module
 */
export function getModuleDir(module: Module, srcDir: SrcDirDefinition, options: JavaPluginOptions): string {
  const packageName = getJavaPackageNameForModule(module, options)
  const baseDir = typeof srcDir === 'string' ? srcDir : srcDir(module)
  return baseDir + (baseDir.endsWith('/') ? '' : '/') + packageName.replaceAll('.', '/')
}

/**
 * Finds a schema implementation in the subfolders of a given directory and returns the full path to the file.
 * @param dir The directory to start search in
 * @param schema The schema to search for
 * @param definitionName The definition name to search for. If undefined, the schema itself will be used
 * @returns The full path to the file or undefined if not found
 */
export async function findSchemaFileInDir(dir: string, schema: Schema, definitionName: string | undefined): Promise<string | undefined> {
  const targetFile = getSimpleJavaClassName(schema, definitionName) + '.java'
  return findFileInSubfolders(dir, targetFile)
}

async function findFileInSubfolders(dir: string, targetFile: string): Promise<string | undefined> {
  try {
    const dirStat = await fs.stat(dir)
    if (!dirStat.isDirectory()) {
      return undefined
    }
  } catch {
    // If the directory doesn't exist or there is an error, return undefined
    return undefined
  }

  const dirents = await fs.readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      const found = await findFileInSubfolders(res, targetFile)
      if (found) return found
    } else if (dirent.isFile() && path.basename(res) === targetFile) {
      return res
    }
  }
  return undefined
}
