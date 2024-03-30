import path from 'path'
import { type Schema, type SchemaType, type Module, type Model } from '../Model'

export function getSchemasForModule (model: Model, moduleOrModuleId: Module | string): Schema[] {
  const moduleId = typeof moduleOrModuleId === 'string' ? moduleOrModuleId : moduleOrModuleId.$id
  return model.schemas.filter(schema => schema.$id.startsWith(moduleId + '/'))
}

export function getSchemasForModuleAndTyp (model: Model, module: Module, typ: SchemaType): Schema[] {
  return getSchemasForModule(model, module).filter(schema => schema['x-schema-type'] === typ)
}

export function getModuleId (schemaOrSchemaId: string | Schema): string {
  const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
  return path.dirname(schemaId)
}

export function getSchema (model: Model, schemaId: string): Schema {
  const schema = model.schemas.find(s => s.$id === schemaId)
  if (!schema) throw new Error(`Schema with id ${schemaId} not found`)
  return schema
}

export function resolveRelativeId (from: Schema | string, relativeId: string): string {
  const fromId = typeof from === 'string' ? from : from.$id
  return path.join(path.dirname(fromId), relativeId)
}

export function relativeLink (fromSchemaOrId: Schema | string, toSchemaOrId: Schema | string): string {
  const fromId = typeof fromSchemaOrId === 'string' ? fromSchemaOrId : fromSchemaOrId.$id
  const toId = typeof toSchemaOrId === 'string' ? toSchemaOrId : toSchemaOrId.$id
  const relative = path.relative(fromId, toId)
  return relative.startsWith('..') ? relative : './' + relative
}

export function getModuleForSchema (model: Model, schemaOrSchemaId: string | Schema): Module {
  const moduleId = getModuleId(schemaOrSchemaId)
  const module = model.modules.find(m => m.$id === moduleId)
  if (!module) {
    const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
    throw new Error(`Module for schema ${schemaId} not found`)
  }
  return module
}

export function cleanName (s: string): string {
  s = s.replace(/[^a-zA-Z0-9]/g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
