import path from 'path'
import { type Input, type Module } from './Input.ts'
import { type Schema, type SchemaType } from './Schema.ts'

export function getSchemasForModule (input: Input, module: Module): Schema[] {
  return input.schemas.filter(schema => schema.$id.startsWith(module.$id + '/'))
}

export function getSchemasForModuleAndTyp (input: Input, module: Module, typ: SchemaType): Schema[] {
  return getSchemasForModule(input, module).filter(schema => schema['x-schema-type'] === typ)
}

export function getModuleId (schemaOrSchemaId: string | Schema): string {
  const schemaId = typeof schemaOrSchemaId === 'string' ? schemaOrSchemaId : schemaOrSchemaId.$id
  return path.dirname(schemaId)
}

export function getSchema (input: Input, schemaId: string): Schema {
  const schema = input.schemas.find(s => s.$id === schemaId)
  if (!schema) throw new Error(`Schema with id ${schemaId} not found`)
  return schema
}

export function getModuleForSchema (input: Input, schemaOrSchemaId: string | Schema): Module {
  const moduleId = getModuleId(schemaOrSchemaId)
  const module = input.modules.find(m => m.$id === moduleId)
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
