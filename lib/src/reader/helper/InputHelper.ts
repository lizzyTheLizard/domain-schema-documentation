import path from 'path'
import { type Schema, type SchemaType, type Module, type Model } from '../Reader'

/**
 * Get all schemas for a given module
 * @param model The model to search in
 * @param moduleOrModuleId The module or module id to search for
 * @returns The schemas for the given module
 */
export function getSchemasForModule (model: Model, moduleOrModuleId: Module | string): Schema[] {
  const moduleId = typeof moduleOrModuleId === 'string' ? moduleOrModuleId : moduleOrModuleId.$id
  return model.schemas.filter(schema => schema.$id.startsWith(moduleId + '/'))
}

/**
 * Get all schemas for a given module and type
 * @param model The model to search in
 * @param moduleOrModuleId The module to search for
 * @param typ The type to search for
 * @returns The schemas for the given module and type
 */
export function getSchemasForModuleAndTyp (model: Model, moduleOrModuleId: Module | string, typ: SchemaType): Schema[] {
  return getSchemasForModule(model, moduleOrModuleId).filter(schema => schema['x-schema-type'] === typ)
}

/**
 * Get the module id for a given schema
 * @param schemaOrSchemaId The schema or schema id to get the module id for
 * @returns The module id for the given schema
 */
export function getModuleId (schemaOrSchemaId: string | Schema): string {
  const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
  return path.dirname(schemaId)
}

/**
 * Get the schema for a given schema id
 * @param model The model to search in
 * @param schemaId The schema id to search for
 * @returns The schema for the given schema id
 * @throws If the schema id is not found
 */
export function getSchema (model: Model, schemaId: string): Schema {
  const schema = model.schemas.find(s => s.$id === schemaId)
  if (!schema) throw new Error(`Schema with id ${schemaId} not found`)
  return schema
}

/**
 * Resolve a relative id into an absolute id
 * @param from The schema or schema id to resolve from
 * @param relativeId The relative id to resolve
 * @returns The resolved absolute id
 */
export function resolveRelativeId (from: Schema | string, relativeId: string): string {
  const fromId = typeof from === 'string' ? from : from.$id
  // TODO: Check this join for OS sep.
  return path.join(path.dirname(fromId), relativeId)
}

/**
 * Get a relative link from one schema to another
 * @param fromSchemaOrId The schema or schema id to link from
 * @param toSchemaOrId The schema or schema id to link to
 * @returns The relative link from one schema to another
 */
export function relativeLink (fromSchemaOrId: Schema | string, toSchemaOrId: Schema | string): string {
  const fromId = typeof fromSchemaOrId === 'string' ? fromSchemaOrId : fromSchemaOrId.$id
  const toId = typeof toSchemaOrId === 'string' ? toSchemaOrId : toSchemaOrId.$id
  // TODO: Check this for backslash
  const relative = path.relative(fromId, toId)
  return relative.startsWith('..') ? relative : './' + relative
}

/**
 * Get the module for a given schema
 * @param model The model to search in
 * @param schemaOrSchemaId The schema or schema id to get the module for
 * @returns The module for the given schema
 */
export function getModuleForSchema (model: Model, schemaOrSchemaId: string | Schema): Module {
  const moduleId = getModuleId(schemaOrSchemaId)
  const module = model.modules.find(m => m.$id === moduleId)
  if (!module) {
    const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
    throw new Error(`Module for schema ${schemaId} not found`)
  }
  return module
}

/**
 * Clean a name to be used as a class name or similar. All non-alphanumeric characters are removed and the first character is capitalized.
 * @param name The name to clean
 * @returns The cleaned name
 */
export function cleanName (name: string): string {
  name = name.replace(/[^a-zA-Z0-9]/g, '')
  return name.charAt(0).toUpperCase() + name.slice(1)
}
